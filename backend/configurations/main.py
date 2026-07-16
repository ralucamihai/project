import os

from pydantic import BaseModel

class GuideTextUpdate(BaseModel):
    text: str

def read_guide_text():
    try:
        file_path = os.path.join(os.path.dirname(__file__), 'guide_text.txt')
        
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
        
        return content 
        
    except Exception as e:
        return f"Error reading guide text: {str(e)}"
    
def write_guide_text(content: str) -> bool:
    """Write guide text to file"""
    try:
        file_path = os.path.join(os.path.dirname(__file__), 'guide_text.txt')
        
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        with open(file_path, 'w', encoding='utf-8') as file:
            file.write(content)
        
        return True
        
    except Exception as e:
        print(f"Error writing guide text: {str(e)}")
        return False
