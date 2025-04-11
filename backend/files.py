import openai
from dotenv import load_dotenv
import os

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

async def upload_file_to_openai(file):
    content = await file.read()
    response = openai.files.create(
        file=(file.filename, content),
        purpose="assistants"
    )
    return response.id
