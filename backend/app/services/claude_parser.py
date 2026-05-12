import os
import json
import logging
from typing import Dict, Any, Optional
from anthropic import Anthropic

logger = logging.getLogger(__name__)

class ClaudeParser:
    def __init__(self):
        # We look for ANTHROPIC_API_KEY in the environment
        self.api_key = os.environ.get("ANTHROPIC_API_KEY")
        if self.api_key and self.api_key != "your_anthropic_api_key_here":
            self.client = Anthropic(api_key=self.api_key)
        else:
            self.client = None
            logger.warning("Anthropic API key not configured. ClaudeParser will return mock data or fail.")

    def parse_query(self, query: str) -> Dict[str, Any]:
        """
        Parses a natural language query (including Malay/English mix) 
        and extracts origin, destination, and preferences.
        """
        if not self.client:
            # Fallback for testing / missing key
            return self._mock_parse(query)

        prompt = f"""
You are a transit assistant for Kuala Lumpur. Extract the origin, destination, and any transit preferences from the user's query. 
The query may be in English, Malay, or a mix of both (Manglish).
Respond ONLY with a valid JSON object with the following schema:
{{
  "origin": "string or null",
  "destination": "string or null",
  "avoid": ["list of strings to avoid, e.g., 'LRT', 'Monorail', 'Bus'"]
}}

User Query: "{query}"
"""
        try:
            message = self.client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=300,
                temperature=0.0,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            # The response content is a list of TextBlock objects
            response_text = message.content[0].text
            parsed = json.loads(response_text)
            return parsed
        except Exception as e:
            logger.error(f"Error calling Claude API: {e}")
            return {"error": str(e)}

    def _mock_parse(self, query: str) -> Dict[str, Any]:
        """A simple mock parser for testing when API key is not available."""
        q_lower = query.lower()
        res = {"origin": None, "destination": None, "avoid": []}
        
        # Super basic regex/heuristic for the specific test case: "nak pergi Midvalley dari Chow Kit elak LRT"
        if "midvalley" in q_lower or "mid valley" in q_lower:
            res["destination"] = "Mid Valley"
        if "chow kit" in q_lower:
            res["origin"] = "Chow Kit"
        if "elak lrt" in q_lower or "avoid lrt" in q_lower:
            res["avoid"] = ["LRT"]
            
        return res
