import os
import glob
import logging
from typing import List, Any
from dotenv import load_dotenv

from docling.document_converter import DocumentConverter
from langchain_text_splitters import MarkdownHeaderTextSplitter
from langchain_community.vectorstores import Chroma
# from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain.retrievers import EnsembleRetriever
from langchain_community.retrievers import BM25Retriever
from langchain_core.documents import Document

from utils.utils import config

load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class DocumentProcessor:
    def __init__(self, headers_to_split_on: List[str]):
        self.headers_to_split_on = headers_to_split_on

    def clean_text(self, text: str) -> str:
        import re
        text = re.sub(r"(?<=[\wÀ-Ỵà-ỹ]) (?=[\wÀ-Ỵà-ỹ])", "", text)
        text = re.sub(r"\n(?=\S)", " ", text)
        text = re.sub(r"\s{2,}", " ", text)
        return text.strip()

    def process(self, source: Any) -> List[Document]:
        try:
            logger.info("Starting document processing.")
            converter = DocumentConverter()
            markdown_document = converter.convert(source).document.export_to_markdown()
            splitter = MarkdownHeaderTextSplitter(self.headers_to_split_on)
            raw_docs = splitter.split_text(markdown_document)

            cleaned_docs = [
                Document(
                    page_content=self.clean_text(doc.page_content),
                    metadata=doc.metadata,
                )
                for doc in raw_docs
            ]

            logger.info("Document processed successfully.")
            return cleaned_docs
        except Exception as e:
            logger.error(f"Error processing document: {e}")
            raise RuntimeError(f"Error processing document: {e}")


class IndexBuilder:
    def __init__(self, docs_list: List[Document], collection_name: str, persist_directory: str, load_documents: bool):
        self.docs_list = docs_list
        self.collection_name = collection_name
        self.persist_directory = persist_directory
        self.load_documents = load_documents
        self.vectorstore = None

    def build_vectorstore(self, subfolder: str = None):
        embeddings = OpenAIEmbeddings()
        try:
            subfolder_path = os.path.join(self.persist_directory, subfolder)

            if os.path.exists(subfolder_path):
                logger.info(f"Vectorstore already exists at {subfolder_path}. Skipping creation.")
                return False

            os.makedirs(subfolder_path, exist_ok=True)
            logger.info(f"Building vectorstore for {subfolder}.")

            self.vectorstore = Chroma.from_documents(
                documents=self.docs_list,
                collection_name=self.collection_name,
                persist_directory=subfolder_path,
                embedding=embeddings,
            )
            logger.info(f"Vectorstore for {subfolder} built successfully.")
            return True
        except Exception as e:
            logger.error(f"Error building vectorstore for {subfolder}: {e}")
            raise RuntimeError(f"Error building vectorstore for {subfolder}: {e}")

    def build_retrievers(self):
        try:
            logger.info("Building BM25 retriever.")
            bm25_retriever = BM25Retriever.from_documents(self.docs_list, search_kwargs={"k": 4})

            logger.info("Building vector-based retrievers.")
            retriever_vanilla = self.vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": 4})
            retriever_mmr = self.vectorstore.as_retriever(search_type="mmr", search_kwargs={"k": 4})

            logger.info("Combining retrievers into an ensemble retriever.")
            ensemble_retriever = EnsembleRetriever(
                retrievers=[retriever_vanilla, retriever_mmr, bm25_retriever],
                weights=[0.3, 0.3, 0.4],
            )
            logger.info("Retrievers built successfully.")
            return ensemble_retriever
        except Exception as e:
            logger.error(f"Error building retrievers: {e}")
            raise RuntimeError(f"Error building retrievers: {e}")


def process_documents_from_folders(folders: List[str], persist_directory: str, headers_to_split_on: List[str], collection_name: str, load_documents: bool):
    all_docs = []
    total_vectorstores_created = 0
    total_vectorstores_loaded = 0

    for folder in folders:
        files = glob.glob(os.path.join(folder, "*.pdf")) + glob.glob(os.path.join(folder, "*.docx"))

        if not files:
            logger.warning(f"No documents found in {folder}. Skipping.")
            continue

        logger.info(f"Processing documents from folder: {folder}")
        processor = DocumentProcessor(headers_to_split_on)
        docs_list = []

        for file in files:
            try:
                docs_list.extend(processor.process(file))
            except RuntimeError as e:
                logger.error(f"Failed to process document {file}: {e}")
                continue

        all_docs.extend(docs_list)
        index_builder = IndexBuilder(docs_list, collection_name, persist_directory, load_documents)
        is_created = index_builder.build_vectorstore(subfolder=os.path.basename(folder))

        if is_created:
            total_vectorstores_created += 1
            try:
                _ = index_builder.build_retrievers()
                logger.info(f"Index and retrievers built for {folder} successfully.")
            except RuntimeError as e:
                logger.critical(f"Failed to build index or retrievers for {folder}: {e}")
                continue
        else:
            total_vectorstores_loaded += 1
            logger.info(f"Loaded vectorstore from {folder}.")

    logger.info(f"Total vectorstores created: {total_vectorstores_created}")
    logger.info(f"Total vectorstores loaded: {total_vectorstores_loaded}")


if __name__ == "__main__":
    headers_to_split_on = config["retriever"]["headers_to_split_on"]
    collection_name = config["retriever"]["collection_name"]
    load_documents = config["retriever"]["load_documents"]

    folders_to_process = ["retriever/data/dao_tao", "retriever/data/student"]

    logger.info("Processing documents from multiple folders.")
    process_documents_from_folders(
        folders_to_process,
        persist_directory="vector_db",
        headers_to_split_on=headers_to_split_on,
        collection_name=collection_name,
        load_documents=load_documents
    )
