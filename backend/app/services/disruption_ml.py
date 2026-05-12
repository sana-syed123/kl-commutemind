import logging
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import os
import joblib

logger = logging.getLogger(__name__)

class DisruptionPredictor:
    def __init__(self, model_path: str = "data/xgboost_disruption.model"):
        self.model_path = model_path
        self.model = None
        if os.path.exists(self.model_path):
            self.model = joblib.load(self.model_path)
            
    def predict_disruption(self, features: pd.DataFrame) -> list:
        if not self.model:
            logger.warning("No ML model loaded. Returning default 0 (no disruption).")
            return [0] * len(features)
        return self.model.predict(features)

def train_offline_model(parquet_url: str = "https://krinstitute.org/assets/data/greater_kl_mobilities.parquet", output_path: str = "data/xgboost_disruption.model"):
    """
    Offline training pipeline for the XGBoost model using the real Greater KL Mobilities dataset.
    """
    logger.info(f"Downloading real historical dataset from {parquet_url} ...")
    
    try:
        # Load the parquet file from krinstitute.org
        df = pd.read_parquet(parquet_url)
        logger.info(f"Successfully loaded dataset with {len(df)} records.")
    except Exception as e:
        logger.error(f"Failed to load dataset from {parquet_url}: {e}")
        logger.info("Falling back to local data if available...")
        # Fallback for demonstration if the URL is blocked or down
        if os.path.exists("data/greater_kl_mobilities.parquet"):
            df = pd.read_parquet("data/greater_kl_mobilities.parquet")
        else:
            raise RuntimeError("Could not fetch training data.")

    # Data Preprocessing
    # Assuming the dataset has columns like 'weather_condition', 'time_of_day', 'day_of_week', 'historical_delay_mins'
    # We want to predict if delay > 15 mins (Disrupted = 1, Normal = 0)
    
    required_cols = ['weather_condition', 'time_of_day', 'day_of_week', 'historical_delay_mins']
    for col in required_cols:
        if col not in df.columns:
            # If real schema differs, map it appropriately
            df[col] = 0 # Placeholder if missing

    df['is_disrupted'] = (df['historical_delay_mins'] > 15).astype(int)
    
    features = ['weather_condition', 'time_of_day', 'day_of_week']
    X = df[features]
    y = df['is_disrupted']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    logger.info("Training XGBoost Classifier...")
    model = xgb.XGBClassifier(
        n_estimators=100, 
        max_depth=6, 
        learning_rate=0.1, 
        random_state=42,
        use_label_encoder=False,
        eval_metric='logloss'
    )
    
    model.fit(X_train, y_train)
    
    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)
    logger.info(f"Model trained. Accuracy: {acc:.2f}")
    logger.info(f"Classification Report:\n{classification_report(y_test, preds)}")
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    joblib.dump(model, output_path)
    logger.info(f"Model saved to {output_path}")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    # Uncomment to train locally
    # train_offline_model()
