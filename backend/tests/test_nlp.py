import pytest
from app.services.claude_parser import ClaudeParser

def test_claude_parser_manglish():
    parser = ClaudeParser()
    query = "nak pergi Midvalley dari Chow Kit elak LRT"
    
    # Since we might not have a real ANTHROPIC_API_KEY in the test env, 
    # we expect the parser to fall back to the mock or use the real API if available.
    result = parser.parse_query(query)
    
    assert "error" not in result
    
    # Check if the parsing extracted the correct entities
    # In Manglish: 'nak pergi' = want to go, 'dari' = from, 'elak' = avoid
    
    origin = result.get('origin', '').lower() if result.get('origin') else ''
    destination = result.get('destination', '').lower() if result.get('destination') else ''
    avoid = [a.lower() for a in result.get('avoid', [])]
    
    assert 'chow kit' in origin
    assert 'mid valley' in destination or 'midvalley' in destination
    assert 'lrt' in avoid
