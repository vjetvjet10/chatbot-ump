import sys, os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from agents.document_agent import process_all_documents

if __name__ == "__main__":
    process_all_documents()
