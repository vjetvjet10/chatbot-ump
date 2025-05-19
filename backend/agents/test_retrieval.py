from config import get_vectorstore

query = "học phí ngành Y khoa"
domain = "dao_tao"

vs = get_vectorstore(domain)
print("[🧠 COLLECTION NAME]", vs._collection.name)
print("[📂 PERSIST DIR]", vs._persist_directory)
print("[📄 SỐ DOCUMENTS TRONG VECTORSTORE]", vs._collection.count())
retriever = vs.as_retriever(search_type="similarity", search_kwargs={"k": 5})

docs = retriever.invoke(query)

print(f"🔍 Tìm được {len(docs)} tài liệu liên quan đến: '{query}'")
for i, doc in enumerate(docs):
    print(f"\n--- [Document {i+1}] ---")
    print(doc.page_content[:300])  # Hiển thị 300 ký tự đầu
    print("Metadata:", doc.metadata)
    print("📌 Embedding model:", vs._embedding_function.model)


