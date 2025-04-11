
// 'use client'

// import { useState, useEffect, useRef } from "react"

// interface ChatUIProps {
//   onNewSource?: (filename: string) => void
// }

// export default function ChatUI({ onNewSource }: ChatUIProps) {
//   const [messages, setMessages] = useState<string[]>([])
//   const [input, setInput] = useState("")
//   const [isLoading, setIsLoading] = useState(false)
//   const [hasFirstToken, setHasFirstToken] = useState(false)
//   const [typingText, setTypingText] = useState("")
//   const [socket, setSocket] = useState<WebSocket | null>(null)
//   const [isConnected, setIsConnected] = useState(false)
//   const endRef = useRef<HTMLDivElement | null>(null)
//   const botReplyRef = useRef("")
//   const reconnectAttempts = useRef(0)
//   const loadingMessage = "Đang tìm kiếm thông tin..."

//   const [suggestedQuestions] = useState<string[]>([
//     "Học phí ngành Y khoa?",
//     "Chỉ tiêu SAT ngành Y khoa?",
//     "Các phương thức xét tuyển?"
//   ])

//   // Khởi tạo WebSocket với cơ chế reconnect
//   useEffect(() => {
//     const connectWebSocket = () => {
//       const ws = new WebSocket("ws://localhost:8000/chat")

//       ws.onopen = () => {
//         console.log("✅ WebSocket connected")
//         setIsConnected(true)
//         reconnectAttempts.current = 0
//         setSocket(ws)
//       }

//       ws.onmessage = (event: MessageEvent) => {
//         const rawData = event.data
//         console.log("📥 [WebSocket] Received:", rawData)

//         // Xử lý message kết thúc
//         if (rawData === "[END]") {
//           console.log("✅ Stream completed")
//           setIsLoading(false)
//           return
//         }

//         try {
//           const parsed = JSON.parse(rawData)
          
//           // Xử lý stream token
//           if (parsed.stream) {
//             botReplyRef.current += parsed.stream
//             setMessages(prev => {
//               const updated = [...prev]
//               updated[updated.length - 1] = `🤖: ${botReplyRef.current}`
//               return updated
//             })
//             if (!hasFirstToken) setHasFirstToken(true)
//           }
          
//           // Xử lý tài liệu (nếu cần)
//           if (parsed.docs) {
//             console.log("📄 Documents:", parsed.docs)
//           }
          
//           // Xử lý gợi ý (nếu cần)
//           if (parsed.suggestions) {
//             console.log("💡 Suggestions:", parsed.suggestions)
//           }
//         } catch (err) {
//           console.error("❌ Failed to parse message:", err)
//         }
//       }

//       ws.onclose = () => {
//         console.warn("⚠️ WebSocket closed")
//         setIsConnected(false)
        
//         // Tự động kết nối lại với exponential backoff
//         if (reconnectAttempts.current < 5) {
//           const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
//           reconnectAttempts.current++
//           console.log(`⌛ Reconnecting in ${delay}ms...`)
//           setTimeout(connectWebSocket, delay)
//         }
//       }

//       ws.onerror = (error) => {
//         console.error("❌ WebSocket error:", error)
//       }
//     }

//     connectWebSocket()

//     return () => {
//       if (socket) {
//         socket.close()
//       }
//     }
//   }, [])

//   // Hiệu ứng typing khi chờ phản hồi
//   useEffect(() => {
//     if (!isLoading || hasFirstToken) return
    
//     let index = 0
//     const interval = setInterval(() => {
//       setTypingText(loadingMessage.slice(0, index + 1))
//       index = (index + 1) % (loadingMessage.length + 1)
//     }, 100)
    
//     return () => clearInterval(interval)
//   }, [isLoading, hasFirstToken])

//   // Tự động scroll xuống khi có tin nhắn mới
//   useEffect(() => {
//     endRef.current?.scrollIntoView({ behavior: "smooth" })
//   }, [messages])

//   // Lưu lịch sử chat vào localStorage
//   useEffect(() => {
//     if (messages.length > 0) {
//       localStorage.setItem("chat_history", JSON.stringify(messages))
//     }
//   }, [messages])

//   // Khôi phục lịch sử chat khi tải trang
//   useEffect(() => {
//     const saved = localStorage.getItem("chat_history")
//     if (saved) setMessages(JSON.parse(saved))
//   }, [])

//   // Gửi tin nhắn qua WebSocket
//   const sendMessage = (msg?: string) => {
//     const question = msg || input
//     if (!question.trim() || !socket || !isConnected) return

//     console.log("📤 Sending message:", question)
//     botReplyRef.current = "" // Reset nội dung trả lời
//     setMessages(prev => [...prev, `🧑: ${question}`, "🤖: "])
//     setInput("")
//     setIsLoading(true)
//     setHasFirstToken(false)

//     try {
//       socket.send(JSON.stringify({ message: question }))
//     } catch (err) {
//       console.error("❌ Failed to send message:", err)
//       setIsLoading(false)
//     }
//   }

//   // Phát hiện tài liệu trong câu trả lời
//   useEffect(() => {
//     const lastMessage = messages[messages.length - 1]
//     if (!lastMessage || !lastMessage.startsWith("🤖:")) return
    
//     const content = lastMessage.replace(/^🤖: /, "")
//     const match = content.match(/【[^†]*†(.*?)】/)
//     const filename = match?.[1]
    
//     if (filename) onNewSource?.(filename)
//   }, [messages])

//   // Render UI
//   return (
//     <div className="flex flex-col h-full font-sans text-base leading-relaxed">
//       {/* Trạng thái kết nối */}
//       <div className={`p-2 text-center text-sm ${
//         isConnected ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
//       }`}>
//         {isConnected ? "🟢 Đã kết nối" : "🟡 Đang kết nối..."}
//       </div>

//       {/* Khung chat */}
//       <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-white">
//         {messages.map((msg, i) => {
//           const isBot = msg.startsWith("🤖:")
//           const content = msg.replace(/^🧑: |^🤖: /, "")
//           const match = content.match(/^(.*?)(?=\d+\.\s)/s)
//           const intro = match ? match[1].trim() : ""
//           const listText = match ? content.slice(match[1].length) : ""
//           const listItems = listText.split(/\n?\d+\.\s+/).filter(Boolean)
//           const isNumberedList = isBot && listItems.length > 0
//           const formattedIntro = intro.replace(/(【.*?】)/g, "\n$1").trim()
//           const isLastBot = isBot && i === messages.length - 1
//           const contentToShow = isLastBot && isLoading && !hasFirstToken
//             ? typingText
//             : content

//           return (
//             <div
//               key={i}
//               className={`p-3 rounded shadow-sm whitespace-pre-wrap ${
//                 isBot ? "bg-white-50" : "bg-gray-100"
//               }`}
//             >
//               {isBot ? (
//                 <p className="font-semibold mb-1 text-green-700">UMP AI:</p>
//               ) : (
//                 <p className="font-semibold mb-1 text-blue-700">User:</p>
//               )}

//               {formattedIntro && (
//                 <p className="mb-2 whitespace-pre-wrap">
//                   {isLastBot && isLoading && !hasFirstToken ? contentToShow : formattedIntro}
//                 </p>
//               )}
              
//               {isNumberedList ? (
//                 <ol className="list-decimal list-inside space-y-1">
//                   {listItems.map((item, idx) => (
//                     <li key={idx}>{item.replace(/\*\*/g, "").trim()}</li>
//                   ))}
//                 </ol>
//               ) : (
//                 !formattedIntro && (
//                   <p className="whitespace-pre-wrap">
//                     {contentToShow.replace(/(【.*?】)/g, "\n$1")}
//                   </p>
//                 )
//               )}
//             </div>
//           )
//         })}
//         <div ref={endRef} />
//       </div>

//       {/* Ô nhập tin nhắn */}
//       <div className="p-4 border-t bg-white flex gap-2">
//         <input
//           className="flex-1 border p-2 rounded"
//           value={input}
//           onChange={(e) => setInput(e.target.value)}
//           onKeyDown={(e) => {
//             if (e.key === "Enter" && !e.shiftKey) {
//               e.preventDefault()
//               sendMessage()
//             }
//           }}
//           placeholder="Nhập câu hỏi..."
//           disabled={!isConnected}
//         />
//         <button
//           className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
//           onClick={() => sendMessage()}
//           disabled={!isConnected || isLoading}
//         >
//           {isLoading ? "Đang xử lý..." : "Gửi"}
//         </button>
//       </div>

//       {/* Gợi ý câu hỏi */}
//       <div className="p-4 bg-gray-50 border-t">
//         <p className="text-sm text-gray-500 mb-2">💡 Gợi ý:</p>
//         <div className="flex flex-wrap gap-2">
//           {suggestedQuestions.map((q, i) => (
//             <button
//               key={i}
//               onClick={() => sendMessage(q)}
//               className="bg-gray-200 hover:bg-gray-300 text-sm px-3 py-1 rounded disabled:opacity-50"
//               disabled={!isConnected || isLoading}
//             >
//               {q}
//             </button>
//           ))}
//         </div>
//       </div>

//       {/* Xóa lịch sử chat */}
//       <div className="p-4 bg-gray-100 border-t text-right">
//         <button
//           onClick={() => {
//             if (confirm("Bạn chắc chắn muốn xóa lịch sử chat?")) {
//               setMessages([])
//               localStorage.removeItem("chat_history")
//             }
//           }}
//           className="text-sm text-red-600 hover:underline"
//         >
//           ♻️ Xóa lịch sử chat
//         </button>
//       </div>
//     </div>
//   )
// }
// 'use client'

// import { useState, useEffect, useRef } from "react"

// interface ChatUIProps {
//   onNewSource?: (filename: string) => void
// }

// export default function ChatUI({ onNewSource }: ChatUIProps) {
//   const [messages, setMessages] = useState<string[]>([])
//   const [input, setInput] = useState("")
//   const [isLoading, setIsLoading] = useState(false)
//   const [hasFirstToken, setHasFirstToken] = useState(false)
//   const [typingText, setTypingText] = useState("")
//   const [socket, setSocket] = useState<WebSocket | null>(null)
//   const [isConnected, setIsConnected] = useState(false)
//   const endRef = useRef<HTMLDivElement | null>(null)
//   const botReplyRef = useRef("")
//   const reconnectAttempts = useRef(0)
//   const loadingMessage = "Đang tìm kiếm thông tin..."

//   const [suggestedQuestions] = useState<string[]>([
//     "Học phí ngành Y khoa?",
//     "Chỉ tiêu SAT ngành Y khoa?",
//     "Các phương thức xét tuyển?"
//   ])

//   const [sources, setSources] = useState<Record<number, string[]>>({}) // 🆕 BỔ SUNG

//   // Khởi tạo WebSocket với cơ chế reconnect
//   useEffect(() => {
//     const connectWebSocket = () => {
//       const ws = new WebSocket("ws://localhost:8000/chat")

//       ws.onopen = () => {
//         console.log("✅ WebSocket connected")
//         setIsConnected(true)
//         reconnectAttempts.current = 0
//         setSocket(ws)
//       }

//       ws.onmessage = (event: MessageEvent) => {
//         const rawData = event.data
//         console.log("📥 [WebSocket] Received:", rawData)

//         if (rawData === "[END]") {
//           console.log("✅ Stream completed")
//           setIsLoading(false)
//           return
//         }

//         try {
//           const parsed = JSON.parse(rawData)
          
//           if (parsed.stream) {
//             botReplyRef.current += parsed.stream
//             setMessages(prev => {
//               const updated = [...prev]
//               updated[updated.length - 1] = `🤖: ${botReplyRef.current}`
//               return updated
//             })
//             if (!hasFirstToken) setHasFirstToken(true)
//           }

//           if (parsed.docs) {
//             console.log("📄 Documents:", parsed.docs)
//             const docList = parsed.docs.map((doc: any) => doc.source).filter(Boolean) // 🆕 BỔ SUNG
//             setSources(prev => ({ ...prev, [messages.length - 1]: docList })) // 🆕 BỔ SUNG
//           }

//           if (parsed.suggestions) {
//             console.log("💡 Suggestions:", parsed.suggestions)
//           }
//         } catch (err) {
//           console.error("❌ Failed to parse message:", err)
//         }
//       }

//       ws.onclose = () => {
//         console.warn("⚠️ WebSocket closed")
//         setIsConnected(false)
//         if (reconnectAttempts.current < 5) {
//           const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
//           reconnectAttempts.current++
//           console.log(`⌛ Reconnecting in ${delay}ms...`)
//           setTimeout(connectWebSocket, delay)
//         }
//       }

//       ws.onerror = (error) => {
//         console.error("❌ WebSocket error:", error)
//       }
//     }

//     connectWebSocket()

//     return () => {
//       if (socket) {
//         socket.close()
//       }
//     }
//   }, [])

//   useEffect(() => {
//     if (!isLoading || hasFirstToken) return
    
//     let index = 0
//     const interval = setInterval(() => {
//       setTypingText(loadingMessage.slice(0, index + 1))
//       index = (index + 1) % (loadingMessage.length + 1)
//     }, 100)
    
//     return () => clearInterval(interval)
//   }, [isLoading, hasFirstToken])

//   useEffect(() => {
//     endRef.current?.scrollIntoView({ behavior: "smooth" })
//   }, [messages])

//   useEffect(() => {
//     if (messages.length > 0) {
//       localStorage.setItem("chat_history", JSON.stringify(messages))
//     }
//   }, [messages])

//   useEffect(() => {
//     const saved = localStorage.getItem("chat_history")
//     if (saved) setMessages(JSON.parse(saved))
//   }, [])

//   const sendMessage = (msg?: string) => {
//     const question = msg || input
  
//     console.log("📤 Gửi:", question)
//     console.log("🔌 WebSocket connected:", isConnected)
//     console.log("🧪 WebSocket readyState:", socket?.readyState)
  
//     if (!question.trim()) {
//       console.warn("⚠️ Không có nội dung để gửi.")
//       return
//     }
  
//     if (!socket || !isConnected || socket.readyState !== 1) {
//       console.warn("⚠️ WebSocket chưa sẵn sàng để gửi.")
//       return
//     }
  
//     botReplyRef.current = ""
//     setMessages(prev => [...prev, `🧑: ${question}`, "🤖: "])
//     setInput("")
//     setIsLoading(true)
//     setHasFirstToken(false)
  
//     try {
//       socket.send(JSON.stringify({ message: question }))
//       console.log("✅ Đã gửi thành công qua WebSocket")
//     } catch (err) {
//       console.error("❌ Gửi thất bại:", err)
//       setIsLoading(false)
//     }
//   }
  

//   useEffect(() => {
//     const lastMessage = messages[messages.length - 1]
//     if (!lastMessage || !lastMessage.startsWith("🤖:")) return
    
//     const content = lastMessage.replace(/^🤖: /, "")
//     const match = content.match(/【[^†]*†(.*?)】/)
//     const filename = match?.[1]
    
//     if (filename) onNewSource?.(filename)
//   }, [messages])

//   return (
//     <div className="flex flex-col h-full font-sans text-base leading-relaxed">
//       <div className={`p-2 text-center text-sm ${
//         isConnected ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
//       }`}>
//         {isConnected ? "🟢 Đã kết nối" : "🟡 Đang kết nối..."}
//       </div>

//       <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-white">
//         {messages.map((msg, i) => {
//           const isBot = msg.startsWith("🤖:")
//           const content = msg.replace(/^🧑: |^🤖: /, "")
//           const match = content.match(/^(.*?)(?=\d+\.\s)/s)
//           const intro = match ? match[1].trim() : ""
//           const listText = match ? content.slice(match[1].length) : ""
//           const listItems = listText.split(/\n?\d+\.\s+/).filter(Boolean)
//           const isNumberedList = isBot && listItems.length > 0
//           const formattedIntro = intro.replace(/(【.*?】)/g, "\n$1").trim()
//           const isLastBot = isBot && i === messages.length - 1
//           const contentToShow = isLastBot && isLoading && !hasFirstToken
//             ? typingText
//             : content

//           return (
//             <div
//               key={i}
//               className={`p-3 rounded shadow-sm whitespace-pre-wrap ${
//                 isBot ? "bg-white-50" : "bg-gray-100"
//               }`}
//             >
//               {isBot ? (
//                 <p className="font-semibold mb-1 text-green-700">UMP AI:</p>
//               ) : (
//                 <p className="font-semibold mb-1 text-blue-700">User:</p>
//               )}

//               {formattedIntro && (
//                 <p className="mb-2 whitespace-pre-wrap">
//                   {isLastBot && isLoading && !hasFirstToken ? contentToShow : formattedIntro}
//                 </p>
//               )}
              
//               {isNumberedList ? (
//                 <ol className="list-decimal list-inside space-y-1">
//                   {listItems.map((item, idx) => (
//                     <li key={idx}>{item.replace(/\*\*/g, "").trim()}</li>
//                   ))}
//                 </ol>
//               ) : (
//                 !formattedIntro && (
//                   <p className="whitespace-pre-wrap">
//                     {contentToShow.replace(/(【.*?】)/g, "\n$1")}
//                   </p>
//                 )
//               )}

//               {/* 🆕 BỔ SUNG: Hiển thị tài liệu nguồn nếu có */}
//               {isBot && sources[i]?.length > 0 && (
//                 <div className="mt-2 text-sm text-gray-500">
//                   <p className="font-semibold">Nguồn tham khảo:</p>
//                   <ul className="list-disc list-inside">
//                     {sources[i].map((src, idx) => (
//                       <li key={idx}>{src}</li>
//                     ))}
//                   </ul>
//                 </div>
//               )}
//             </div>
//           )
//         })}
//         <div ref={endRef} />
//       </div>

//       <div className="p-4 border-t bg-white flex gap-2">
//         <input
//           className="flex-1 border p-2 rounded"
//           value={input}
//           onChange={(e) => setInput(e.target.value)}
//           onKeyDown={(e) => {
//             if (e.key === "Enter" && !e.shiftKey) {
//               e.preventDefault()
//               sendMessage()
//             }
//           }}
//           placeholder="Nhập câu hỏi..."
//           disabled={!isConnected}
//         />
//         <button
//           className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
//           onClick={() => sendMessage()}
//           disabled={!isConnected || isLoading}
//         >
//           {isLoading ? "Đang xử lý..." : "Gửi"}
//         </button>
//       </div>

//       <div className="p-4 bg-gray-50 border-t">
//         <p className="text-sm text-gray-500 mb-2">💡 Gợi ý:</p>
//         <div className="flex flex-wrap gap-2">
//           {suggestedQuestions.map((q, i) => (
//             <button
//               key={i}
//               onClick={() => sendMessage(q)}
//               className="bg-gray-200 hover:bg-gray-300 text-sm px-3 py-1 rounded disabled:opacity-50"
//               disabled={!isConnected || isLoading}
//             >
//               {q}
//             </button>
//           ))}
//         </div>
//       </div>

//       <div className="p-4 bg-gray-100 border-t text-right">
//         <button
//           onClick={() => {
//             if (confirm("Bạn chắc chắn muốn xóa lịch sử chat?")) {
//               setMessages([])
//               localStorage.removeItem("chat_history")
//             }
//           }}
//           className="text-sm text-red-600 hover:underline"
//         >
//           ♻️ Xóa lịch sử chat
//         </button>
//       </div>
//     </div>
//   )
// }

// 1. ChatUI.tsx
// 1. ChatUI.tsx
// 1. ChatUI.tsx
// 1. ChatUI.tsx
// 'use client'

// import { useState, useEffect, useRef } from "react"

// interface ChatUIProps {
//   onNewSources?: (filenames: string[]) => void
// }

// export default function ChatUI({ onNewSources }: ChatUIProps) {
//   const [messages, setMessages] = useState<string[]>([])
//   const [input, setInput] = useState("")
//   const [isLoading, setIsLoading] = useState(false)
//   const [hasFirstToken, setHasFirstToken] = useState(false)
//   const [typingText, setTypingText] = useState("")
//   const [socket, setSocket] = useState<WebSocket | null>(null)
//   const [isConnected, setIsConnected] = useState(false)
//   const endRef = useRef<HTMLDivElement | null>(null)
//   const botReplyRef = useRef("")
//   const reconnectAttempts = useRef(0)
//   const loadingMessage = "Đang tìm kiếm thông tin..."

//   const [sources, setSources] = useState<Record<number, string[]>>({})
//   const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
//   const currentBotIndex = useRef<number>(-1)

//   useEffect(() => {
//     const connectWebSocket = () => {
//       const ws = new WebSocket("ws://localhost:8000/chat")

//       ws.onopen = () => {
//         setIsConnected(true)
//         reconnectAttempts.current = 0
//         setSocket(ws)
//       }

//       ws.onmessage = (event: MessageEvent) => {
//         const rawData = event.data
//         if (rawData === "[END]") {
//           setIsLoading(false)
//           return
//         }

//         try {
//           const parsed = JSON.parse(rawData)

//           if (parsed.stream) {
//             botReplyRef.current += parsed.stream
//             setMessages(prev => {
//               const updated = [...prev]
//               updated[updated.length - 1] = `🤖: ${botReplyRef.current}`
//               return updated
//             })
//             if (!hasFirstToken) setHasFirstToken(true)
//           }

//           if (parsed.docs) {
//             const docList = parsed.docs.map((doc: any) => ({
//               source: doc.source,
//               snippet: doc.snippet || ""
//             })).filter(doc => doc.source)
//             const realIndex = currentBotIndex.current
//             if (realIndex >= 0) {
//               setSources(prev => ({ ...prev, [realIndex]: [...new Set([...(prev[realIndex] || []), ...docList])] }))
//               onNewSources?.([...new Set(docList)])
//               // onNewSources?.(docList.map(d => d.source))
//             }
//           }

//           if (parsed.suggestions) {
//             setSuggestedQuestions(parsed.suggestions)
//           }
//         } catch {}
//       }

//       ws.onclose = () => {
//         setIsConnected(false)
//         if (reconnectAttempts.current < 5) {
//           const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
//           reconnectAttempts.current++
//           setTimeout(connectWebSocket, delay)
//         }
//       }
//     }

//     connectWebSocket()
//     return () => socket?.close()
//   }, [])

//   useEffect(() => {
//     if (!isLoading || hasFirstToken) return
//     let index = 0
//     const interval = setInterval(() => {
//       setTypingText(loadingMessage.slice(0, index + 1))
//       index = (index + 1) % (loadingMessage.length + 1)
//     }, 100)
//     return () => clearInterval(interval)
//   }, [isLoading, hasFirstToken])

//   useEffect(() => {
//     endRef.current?.scrollIntoView({ behavior: "smooth" })
//   }, [messages])

//   const sendMessage = (msg?: string) => {
//     const question = msg || input
//     if (!question.trim() || !socket || !isConnected || socket.readyState !== 1) return

//     botReplyRef.current = ""
//     const newMessages = [...messages, `🧍: ${question}`, "🤖: "]
//     currentBotIndex.current = newMessages.length - 1
//     setMessages(newMessages)
//     setInput("")
//     setIsLoading(true)
//     setHasFirstToken(false)

//     try {
//       socket.send(JSON.stringify({ message: question }))
//     } catch {
//       setIsLoading(false)
//     }
//   }

//   return (
//     <div className="flex flex-col h-full">
//       <div className="flex-1 overflow-y-auto p-4 space-y-3">
//         {messages.map((msg, i) => (
//           <div key={i} className="p-3 rounded bg-gray-100">
//             <p className="font-semibold text-sm text-gray-700">{msg.startsWith("🤖:") ? "UMP AI:" : "User:"}</p>
//             <p className="whitespace-pre-wrap">
//               {msg.startsWith("🤖:") && isLoading && !hasFirstToken && i === messages.length - 1
//                 ? typingText
//                 : msg.replace(/^(🧍|🤖):\s*/, "")}
//             </p>
//             {msg.startsWith("🤖:") && sources[i]?.length > 0 && (
//               <div className="mt-2 text-sm text-gray-500">
//                 <p className="font-semibold">Nguồn tham khảo:</p>
//                 <ul className="list-disc list-inside">
//                   {[...new Set(sources[i])].map((src, idx) => <li key={idx}>{src}</li>)}
//                 </ul>
//               </div>
//             )}
//           </div>
//         ))}
//         <div ref={endRef} />
//       </div>

//       <div className="p-4 border-t bg-white flex gap-2">
//         <input
//           className="flex-1 border p-2 rounded"
//           value={input}
//           onChange={(e) => setInput(e.target.value)}
//           onKeyDown={(e) => {
//             if (e.key === "Enter" && !e.shiftKey) {
//               e.preventDefault()
//               sendMessage()
//             }
//           }}
//           placeholder="Nhập câu hỏi..."
//           disabled={!isConnected}
//         />
//         <button
//           className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
//           onClick={() => sendMessage()}
//           disabled={!isConnected || isLoading}
//         >
//           {isLoading ? "Đang xử lý..." : "Gửi"}
//         </button>
//       </div>

//       <div className="p-4 bg-gray-50 border-t">
//         <p className="text-sm text-gray-500 mb-2">💡 Gợi ý:</p>
//         <div className="flex flex-wrap gap-2">
//           {suggestedQuestions.map((q, i) => (
//             <button
//               key={i}
//               onClick={() => sendMessage(q)}
//               className="bg-gray-200 hover:bg-gray-300 text-sm px-3 py-1 rounded disabled:opacity-50"
//               disabled={!isConnected || isLoading}
//             >
//               {q}
//             </button>
//           ))}
//         </div>
//       </div>
//     </div>
//   )
// } 
// 'use client'

// import { useState, useEffect, useRef } from "react"

// interface ChatUIProps {
//   onNewSources?: (docs: { source: string; snippet: string }[]) => void
// }

// export default function ChatUI({ onNewSources }: ChatUIProps) {
//   const [messages, setMessages] = useState<string[]>([])
//   const [input, setInput] = useState("")
//   const [isLoading, setIsLoading] = useState(false)
//   const [hasFirstToken, setHasFirstToken] = useState(false)
//   const [typingText, setTypingText] = useState("")
//   const [socket, setSocket] = useState<WebSocket | null>(null)
//   const [isConnected, setIsConnected] = useState(false)
//   const endRef = useRef<HTMLDivElement | null>(null)
//   const botReplyRef = useRef("")
//   const reconnectAttempts = useRef(0)
//   const loadingMessage = "Đang tìm kiếm thông tin..."

//   const [sources, setSources] = useState<Record<number, { source: string; snippet: string }[]>>({})
//   const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
//   const currentBotIndex = useRef<number>(-1)

//   useEffect(() => {
//     const connectWebSocket = () => {
//       const ws = new WebSocket("ws://localhost:8000/chat")

//       ws.onopen = () => {
//         setIsConnected(true)
//         reconnectAttempts.current = 0
//         setSocket(ws)
//       }

//       ws.onmessage = (event: MessageEvent) => {
//         const rawData = event.data
//         if (rawData === "[END]") {
//           setIsLoading(false)
//           return
//         }

//         try {
//           const parsed = JSON.parse(rawData)

//           if (parsed.stream) {
//             botReplyRef.current += parsed.stream
//             setMessages(prev => {
//               const updated = [...prev]
//               updated[updated.length - 1] = `🤖: ${botReplyRef.current}`
//               return updated
//             })
//             if (!hasFirstToken) setHasFirstToken(true)
//           }

//           if (parsed.docs) {
//             const docList = parsed.docs.map((doc: any) => ({
//               source: doc.source,
//               snippet: doc.snippet || ""
//             })).filter(doc => doc.source)

//             const realIndex = currentBotIndex.current
//             if (realIndex >= 0) {
//               setSources(prev => ({
//                 ...prev,
//                 [realIndex]: [...new Set([...(prev[realIndex] || []), ...docList.map(d => JSON.stringify(d))])].map(str => JSON.parse(str))
//               }))
//               onNewSources?.(docList)
//             }
//           }

//           if (parsed.suggestions) {
//             setSuggestedQuestions(parsed.suggestions)
//           }
//         } catch {}
//       }

//       ws.onclose = () => {
//         setIsConnected(false)
//         if (reconnectAttempts.current < 5) {
//           const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
//           reconnectAttempts.current++
//           setTimeout(connectWebSocket, delay)
//         }
//       }
//     }

//     connectWebSocket()
//     return () => socket?.close()
//   }, [])

//   useEffect(() => {
//     if (!isLoading || hasFirstToken) return
//     let index = 0
//     const interval = setInterval(() => {
//       setTypingText(loadingMessage.slice(0, index + 1))
//       index = (index + 1) % (loadingMessage.length + 1)
//     }, 100)
//     return () => clearInterval(interval)
//   }, [isLoading, hasFirstToken])

//   useEffect(() => {
//     endRef.current?.scrollIntoView({ behavior: "smooth" })
//   }, [messages])

//   const sendMessage = (msg?: string) => {
//     const question = msg || input
//     if (!question.trim() || !socket || !isConnected || socket.readyState !== 1) return

//     botReplyRef.current = ""
//     const newMessages = [...messages, `🧍: ${question}`, "🤖: "]
//     currentBotIndex.current = newMessages.length - 1
//     setMessages(newMessages)
//     setInput("")
//     setIsLoading(true)
//     setHasFirstToken(false)

//     try {
//       socket.send(JSON.stringify({ message: question }))
//     } catch {
//       setIsLoading(false)
//     }
//   }

//   return (
//     <div className="flex flex-col h-full">
//       <div className="flex-1 overflow-y-auto p-4 space-y-3">
//         {messages.map((msg, i) => (
//           <div key={i} className="p-3 rounded bg-gray-100">
//             <p className="font-semibold text-sm text-gray-700">{msg.startsWith("🤖:") ? "UMP AI:" : "User:"}</p>
//             <p className="whitespace-pre-wrap">
//               {msg.startsWith("🤖:") && isLoading && !hasFirstToken && i === messages.length - 1
//                 ? typingText
//                 : msg.replace(/^(🧍|🤖):\s*/, "")}
//             </p>
//             {msg.startsWith("🤖:") && sources[i]?.length > 0 && (
//               <div className="mt-2 text-sm text-gray-500">
//                 <p className="font-semibold">Nguồn tham khảo:</p>
//                 <ul className="list-disc list-inside">
//                   {[...new Set(sources[i].map(d => d.source))].map((src, idx) => <li key={idx}>{src}</li>)}
//                 </ul>
//               </div>
//             )}
//           </div>
//         ))}
//         <div ref={endRef} />
//       </div>

//       <div className="p-4 border-t bg-white flex gap-2">
//         <input
//           className="flex-1 border p-2 rounded"
//           value={input}
//           onChange={(e) => setInput(e.target.value)}
//           onKeyDown={(e) => {
//             if (e.key === "Enter" && !e.shiftKey) {
//               e.preventDefault()
//               sendMessage()
//             }
//           }}
//           placeholder="Nhập câu hỏi..."
//           disabled={!isConnected}
//         />
//         <button
//           className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
//           onClick={() => sendMessage()}
//           disabled={!isConnected || isLoading}
//         >
//           {isLoading ? "Đang xử lý..." : "Gửi"}
//         </button>
//       </div>

//       <div className="p-4 bg-gray-50 border-t">
//         <p className="text-sm text-gray-500 mb-2">💡 Gợi ý:</p>
//         <div className="flex flex-wrap gap-2">
//           {suggestedQuestions.map((q, i) => (
//             <button
//               key={i}
//               onClick={() => sendMessage(q)}
//               className="bg-gray-200 hover:bg-gray-300 text-sm px-3 py-1 rounded disabled:opacity-50"
//               disabled={!isConnected || isLoading}
//             >
//               {q}
//             </button>
//           ))}
//         </div>
//       </div>
//     </div>
//   )
// }
// 'use client'

// import { useState, useEffect, useRef } from "react"

// interface ChatUIProps {
//   onNewSources?: (docs: { source: string; snippet: string }[]) => void
// }

// export default function ChatUI({ onNewSources }: ChatUIProps) {
//   const [messages, setMessages] = useState<string[]>([])
//   const [input, setInput] = useState("")
//   const [isLoading, setIsLoading] = useState(false)
//   const [hasFirstToken, setHasFirstToken] = useState(false)
//   const [typingText, setTypingText] = useState("")
//   const [socket, setSocket] = useState<WebSocket | null>(null)
//   const [isConnected, setIsConnected] = useState(false)
//   const endRef = useRef<HTMLDivElement | null>(null)
//   const botReplyRef = useRef("")
//   const reconnectAttempts = useRef(0)
//   const loadingMessage = "Đang tìm kiếm thông tin..."

//   const [sources, setSources] = useState<Record<number, { source: string; snippet: string }[]>>({})
//   const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
//   const currentBotIndex = useRef<number>(-1)

//   useEffect(() => {
//     const connectWebSocket = () => {
//       const ws = new WebSocket("ws://localhost:8000/chat")

//       ws.onopen = () => {
//         setIsConnected(true)
//         reconnectAttempts.current = 0
//         setSocket(ws)
//       }

//       ws.onmessage = (event: MessageEvent) => {
//         const rawData = event.data
//         if (rawData === "[END]") {
//           setIsLoading(false)
//           return
//         }

//         try {
//           const parsed = JSON.parse(rawData)

//           if (parsed.stream) {
//             botReplyRef.current += parsed.stream
//             setMessages(prev => {
//               const updated = [...prev]
//               updated[updated.length - 1] = `🤖: ${botReplyRef.current}`
//               return updated
//             })
//             if (!hasFirstToken) setHasFirstToken(true)
//           }

//           if (parsed.docs) {
//             const docList = parsed.docs.map((doc: any) => ({
//               source: doc.source,
//               snippet: doc.snippet || ""
//             })).filter(doc => doc.source)

//             const realIndex = currentBotIndex.current
//             if (realIndex >= 0) {
//               setSources(prev => ({
//                 ...prev,
//                 [realIndex]: [...new Set([...(prev[realIndex] || []), ...docList.map(d => JSON.stringify(d))])].map(str => JSON.parse(str))
//               }))
//               onNewSources?.(docList)
//             }
//           }

//           if (parsed.suggestions) {
//             setSuggestedQuestions(parsed.suggestions)
//           }
//         } catch {}
//       }

//       ws.onclose = () => {
//         setIsConnected(false)
//         if (reconnectAttempts.current < 5) {
//           const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
//           reconnectAttempts.current++
//           setTimeout(connectWebSocket, delay)
//         }
//       }
//     }

//     connectWebSocket()
//     return () => socket?.close()
//   }, [])

//   useEffect(() => {
//     if (!isLoading || hasFirstToken) return
//     let index = 0
//     const interval = setInterval(() => {
//       setTypingText(loadingMessage.slice(0, index + 1))
//       index = (index + 1) % (loadingMessage.length + 1)
//     }, 100)
//     return () => clearInterval(interval)
//   }, [isLoading, hasFirstToken])

//   useEffect(() => {
//     endRef.current?.scrollIntoView({ behavior: "smooth" })
//   }, [messages])

//   const sendMessage = (msg?: string) => {
//     const question = msg || input
//     if (!question.trim() || !socket || !isConnected || socket.readyState !== 1) return

//     botReplyRef.current = ""
//     const newMessages = [...messages, `🧍: ${question}`, "🤖: "]
//     currentBotIndex.current = newMessages.length - 1
//     setMessages(newMessages)
//     setInput("")
//     setIsLoading(true)
//     setHasFirstToken(false)

//     try {
//       socket.send(JSON.stringify({ message: question }))
//     } catch {
//       setIsLoading(false)
//     }
//   }

//   return (
//     <div className="flex flex-col h-full">
//       <div className="flex-1 overflow-y-auto p-4 space-y-3">
//         {messages.map((msg, i) => (
//           <div key={i} className="p-3 rounded bg-gray-100">
//             <p className="font-semibold text-sm text-gray-700">{msg.startsWith("🤖:") ? "UMP AI:" : "User:"}</p>
//             <p className="whitespace-pre-wrap">
//               {msg.startsWith("🤖:") && isLoading && !hasFirstToken && i === messages.length - 1
//                 ? typingText
//                 : msg.replace(/^(🧍|🤖):\s*/, "")}
//             </p>
//             {msg.startsWith("🤖:") && sources[i]?.length > 0 && (
//               <div className="mt-2 text-sm text-gray-500">
//                 <p className="font-semibold">Nguồn tham khảo:</p>
//                 <ul className="list-disc list-inside">
//                   {[...new Set(sources[i].map(d => d.source))].map((src, idx) => <li key={idx}>{src}</li>)}
//                 </ul>
//               </div>
//             )}
//           </div>
//         ))}
//         <div ref={endRef} />
//       </div>

//       <div className="p-4 border-t bg-white flex gap-2">
//         <input
//           className="flex-1 border p-2 rounded"
//           value={input}
//           onChange={(e) => setInput(e.target.value)}
//           onKeyDown={(e) => {
//             if (e.key === "Enter" && !e.shiftKey) {
//               e.preventDefault()
//               sendMessage()
//             }
//           }}
//           placeholder="Nhập câu hỏi..."
//           disabled={!isConnected}
//         />
//         <button
//           className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
//           onClick={() => sendMessage()}
//           disabled={!isConnected || isLoading}
//         >
//           {isLoading ? "Đang xử lý..." : "Gửi"}
//         </button>
//       </div>

//       <div className="p-4 bg-gray-50 border-t">
//         <p className="text-sm text-gray-500 mb-2">💡 Gợi ý:</p>
//         <div className="flex flex-wrap gap-2">
//           {suggestedQuestions.map((q, i) => (
//             <button
//               key={i}
//               onClick={() => sendMessage(q)}
//               className="bg-gray-200 hover:bg-gray-300 text-sm px-3 py-1 rounded disabled:opacity-50"
//               disabled={!isConnected || isLoading}
//             >
//               {q}
//             </button>
//           ))}
//         </div>
//       </div>
//     </div>
//   )
// }
// 'use client'

// import { useState, useEffect, useRef } from "react"

// interface ChatUIProps {
//   onNewSources?: (docs: { source: string; snippet: string }[]) => void
// }

// export default function ChatUI({ onNewSources }: ChatUIProps) {
//   const [messages, setMessages] = useState<string[]>([])
//   const [input, setInput] = useState("")
//   const [isLoading, setIsLoading] = useState(false)
//   const [hasFirstToken, setHasFirstToken] = useState(false)
//   const [typingText, setTypingText] = useState("")
//   const [socket, setSocket] = useState<WebSocket | null>(null)
//   const [isConnected, setIsConnected] = useState(false)
//   const endRef = useRef<HTMLDivElement | null>(null)
//   const botReplyRef = useRef("")
//   const reconnectAttempts = useRef(0)
//   const loadingMessage = "Đang tìm kiếm thông tin..."

//   const [sources, setSources] = useState<Record<number, { source: string; snippet: string }[]>>({})
//   const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
//   const currentBotIndex = useRef<number>(-1)

//   useEffect(() => {
//     const connectWebSocket = () => {
//       const ws = new WebSocket("ws://localhost:8000/chat")

//       ws.onopen = () => {
//         setIsConnected(true)
//         reconnectAttempts.current = 0
//         setSocket(ws)
//       }

//       ws.onmessage = (event: MessageEvent) => {
//         const rawData = event.data

//         if (rawData === "[END]") {
//           setIsLoading(false)

//           // ✅ Extract source after end of stream
//           const realIndex = currentBotIndex.current
//           if (realIndex >= 0) {
//             const matches = botReplyRef.current.match(/【source: (.*?)】/g) || []
//             const uniqueSources = Array.from(new Set(matches.map(m => m.replace(/[【】]/g, '').replace('source: ', ''))))
//             const docs = uniqueSources.map(src => ({ source: src, snippet: '' }))
//             if (docs.length > 0) {
//               setSources(prev => ({ ...prev, [realIndex]: docs }))
//               onNewSources?.(docs)
//             }
//           }
//           return
//         }

//         try {
//           const parsed = JSON.parse(rawData)

//           if (parsed.stream) {
//             botReplyRef.current += parsed.stream
//             setMessages(prev => {
//               const updated = [...prev]
//               updated[updated.length - 1] = `🤖: ${botReplyRef.current}`
//               return updated
//             })
//             if (!hasFirstToken) setHasFirstToken(true)
//           }

//           if (parsed.suggestions) {
//             setSuggestedQuestions(parsed.suggestions)
//           }
//         } catch {}
//       }

//       ws.onclose = () => {
//         setIsConnected(false)
//         if (reconnectAttempts.current < 5) {
//           const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
//           reconnectAttempts.current++
//           setTimeout(connectWebSocket, delay)
//         }
//       }
//     }

//     connectWebSocket()
//     return () => socket?.close()
//   }, [])

//   useEffect(() => {
//     if (!isLoading || hasFirstToken) return
//     let index = 0
//     const interval = setInterval(() => {
//       setTypingText(loadingMessage.slice(0, index + 1))
//       index = (index + 1) % (loadingMessage.length + 1)
//     }, 100)
//     return () => clearInterval(interval)
//   }, [isLoading, hasFirstToken])

//   useEffect(() => {
//     endRef.current?.scrollIntoView({ behavior: "smooth" })
//   }, [messages])

//   const sendMessage = (msg?: string) => {
//     const question = msg || input
//     if (!question.trim() || !socket || !isConnected || socket.readyState !== 1) return

//     botReplyRef.current = ""
//     const newMessages = [...messages, `🧍: ${question}`, "🤖: "]
//     currentBotIndex.current = newMessages.length - 1
//     setMessages(newMessages)
//     setInput("")
//     setIsLoading(true)
//     setHasFirstToken(false)

//     try {
//       socket.send(JSON.stringify({ message: question }))
//     } catch {
//       setIsLoading(false)
//     }
//   }

//   return (
//     <div className="flex flex-col h-full">
//       <div className="flex-1 overflow-y-auto p-4 space-y-3">
//         {messages.map((msg, i) => (
//           <div key={i} className="p-3 rounded bg-gray-100">
//             <p className="font-semibold text-sm text-gray-700">{msg.startsWith("🤖:") ? "UMP AI:" : "User:"}</p>
//             <p className="whitespace-pre-wrap">
//               {msg.startsWith("🤖:") && isLoading && !hasFirstToken && i === messages.length - 1
//                 ? typingText
//                 : msg.replace(/^(🧍|🤖):\s*/, "")}
//             </p>
//             {msg.startsWith("🤖:") && sources[i]?.length > 0 && (
//               <div className="mt-2 text-sm text-gray-500">
//                 <p className="font-semibold">Nguồn tham khảo:</p>
//                 <ul className="list-disc list-inside">
//                   {sources[i].map((src, idx) => <li key={idx}>{src.source}</li>)}
//                 </ul>
//               </div>
//             )}
//           </div>
//         ))}
//         <div ref={endRef} />
//       </div>

//       <div className="p-4 border-t bg-white flex gap-2">
//         <input
//           className="flex-1 border p-2 rounded"
//           value={input}
//           onChange={(e) => setInput(e.target.value)}
//           onKeyDown={(e) => {
//             if (e.key === "Enter" && !e.shiftKey) {
//               e.preventDefault()
//               sendMessage()
//             }
//           }}
//           placeholder="Nhập câu hỏi..."
//           disabled={!isConnected}
//         />
//         <button
//           className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
//           onClick={() => sendMessage()}
//           disabled={!isConnected || isLoading}
//         >
//           {isLoading ? "Đang xử lý..." : "Gửi"}
//         </button>
//       </div>

//       <div className="p-4 bg-gray-50 border-t">
//         <p className="text-sm text-gray-500 mb-2">💡 Gợi ý:</p>
//         <div className="flex flex-wrap gap-2">
//           {suggestedQuestions.map((q, i) => (
//             <button
//               key={i}
//               onClick={() => sendMessage(q)}
//               className="bg-gray-200 hover:bg-gray-300 text-sm px-3 py-1 rounded disabled:opacity-50"
//               disabled={!isConnected || isLoading}
//             >
//               {q}
//             </button>
//           ))}
//         </div>
//       </div>
//     </div>
//   )
// }
// 'use client'

// import { useState, useEffect, useRef } from "react"

// interface ChatUIProps {
//   onNewSources?: (docs: { source: string; snippet: string }[]) => void
// }

// export default function ChatUI({ onNewSources }: ChatUIProps) {
//   const [messages, setMessages] = useState<string[]>([])
//   const [input, setInput] = useState("")
//   const [isLoading, setIsLoading] = useState(false)
//   const [hasFirstToken, setHasFirstToken] = useState(false)
//   const [typingText, setTypingText] = useState("")
//   const [socket, setSocket] = useState<WebSocket | null>(null)
//   const [isConnected, setIsConnected] = useState(false)
//   const endRef = useRef<HTMLDivElement | null>(null)
//   const botReplyRef = useRef("")
//   const reconnectAttempts = useRef(0)
//   const loadingMessage = "Đang tìm kiếm thông tin..."

//   const [sources, setSources] = useState<Record<number, { source: string; snippet: string }[]>>({})
//   const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
//   const currentBotIndex = useRef<number>(-1)

//   useEffect(() => {
//     const connectWebSocket = () => {
//       const ws = new WebSocket("ws://localhost:8000/chat")

//       ws.onopen = () => {
//         setIsConnected(true)
//         reconnectAttempts.current = 0
//         setSocket(ws)
//       }

//       ws.onmessage = (event: MessageEvent) => {
//         const rawData = event.data

//         if (rawData === "[END]") {
//           setIsLoading(false)
//           return
//         }

//         try {
//           const parsed = JSON.parse(rawData)

//           if (parsed.stream) {
//             botReplyRef.current += parsed.stream
//             setMessages(prev => {
//               const updated = [...prev]
//               updated[updated.length - 1] = `🤖: ${botReplyRef.current}`
//               return updated
//             })
//             if (!hasFirstToken) setHasFirstToken(true)
//           }

//           if (parsed.docs) {
//             const docs = parsed.docs as { source: string; snippet: string }[]
//             const realIndex = currentBotIndex.current
//             if (realIndex >= 0) {
//               setSources(prev => ({ ...prev, [realIndex]: docs }))
//               onNewSources?.(docs)
//             }
//           }

//           if (parsed.suggestions) {
//             setSuggestedQuestions(parsed.suggestions)
//           }
//         } catch {}
//       }

//       ws.onclose = () => {
//         setIsConnected(false)
//         if (reconnectAttempts.current < 5) {
//           const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
//           reconnectAttempts.current++
//           setTimeout(connectWebSocket, delay)
//         }
//       }
//     }

//     connectWebSocket()
//     return () => socket?.close()
//   }, [])

//   useEffect(() => {
//     if (!isLoading || hasFirstToken) return
//     let index = 0
//     const interval = setInterval(() => {
//       setTypingText(loadingMessage.slice(0, index + 1))
//       index = (index + 1) % (loadingMessage.length + 1)
//     }, 100)
//     return () => clearInterval(interval)
//   }, [isLoading, hasFirstToken])

//   useEffect(() => {
//     endRef.current?.scrollIntoView({ behavior: "smooth" })
//   }, [messages])

//   const sendMessage = (msg?: string) => {
//     const question = msg || input
//     if (!question.trim() || !socket || !isConnected || socket.readyState !== 1) return

//     botReplyRef.current = ""
//     const newMessages = [...messages, `🧍: ${question}`, "🤖: "]
//     currentBotIndex.current = newMessages.length - 1
//     setMessages(newMessages)
//     setInput("")
//     setIsLoading(true)
//     setHasFirstToken(false)

//     try {
//       socket.send(JSON.stringify({ message: question }))
//     } catch {
//       setIsLoading(false)
//     }
//   }

//   return (
//     <div className="flex flex-col h-full">
//       <div className="flex-1 overflow-y-auto p-4 space-y-3">
//         {messages.map((msg, i) => (
//           <div key={i} className="p-3 rounded bg-gray-100">
//             <p className="font-semibold text-sm text-gray-700">{msg.startsWith("🤖:") ? "UMP AI:" : "User:"}</p>
//             <p className="whitespace-pre-wrap">
//               {msg.startsWith("🤖:") && isLoading && !hasFirstToken && i === messages.length - 1
//                 ? typingText
//                 : msg.replace(/^(🧍|🤖):\s*/, "")}
//             </p>
//             {msg.startsWith("🤖:") && sources[i]?.length > 0 && (
//               <div className="mt-2 text-sm text-gray-500">
//                 <p className="font-semibold">Nguồn tham khảo:</p>
//                 <ul className="list-disc list-inside">
//                   {[...new Set(sources[i].map(d => d.source))].map((src, idx) => (
//                     <li key={idx}>{src}</li>
//                   ))}
//                 </ul>
//               </div>
//             )}
//           </div>
//         ))}
//         <div ref={endRef} />
//       </div>

//       <div className="p-4 border-t bg-white flex gap-2">
//         <input
//           className="flex-1 border p-2 rounded"
//           value={input}
//           onChange={(e) => setInput(e.target.value)}
//           onKeyDown={(e) => {
//             if (e.key === "Enter" && !e.shiftKey) {
//               e.preventDefault()
//               sendMessage()
//             }
//           }}
//           placeholder="Nhập câu hỏi..."
//           disabled={!isConnected}
//         />
//         <button
//           className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
//           onClick={() => sendMessage()}
//           disabled={!isConnected || isLoading}
//         >
//           {isLoading ? "Đang xử lý..." : "Gửi"}
//         </button>
//       </div>

//       <div className="p-4 bg-gray-50 border-t">
//         <p className="text-sm text-gray-500 mb-2">💡 Gợi ý:</p>
//         <div className="flex flex-wrap gap-2">
//           {suggestedQuestions.map((q, i) => (
//             <button
//               key={i}
//               onClick={() => sendMessage(q)}
//               className="bg-gray-200 hover:bg-gray-300 text-sm px-3 py-1 rounded disabled:opacity-50"
//               disabled={!isConnected || isLoading}
//             >
//               {q}
//             </button>
//           ))}
//         </div>
//       </div>
//     </div>
//   )
// }
// 'use client'

// import { useState, useEffect, useRef } from "react"

// interface ChatUIProps {
//   onNewSources?: (docs: { source: string; snippet: string }[]) => void
// }

// export default function ChatUI({ onNewSources }: ChatUIProps) {
//   const [messages, setMessages] = useState<string[]>([])
//   const [input, setInput] = useState("")
//   const [isLoading, setIsLoading] = useState(false)
//   const [hasFirstToken, setHasFirstToken] = useState(false)
//   const [typingText, setTypingText] = useState("")
//   const [socket, setSocket] = useState<WebSocket | null>(null)
//   const [isConnected, setIsConnected] = useState(false)
//   const endRef = useRef<HTMLDivElement | null>(null)
//   const botReplyRef = useRef("")
//   const reconnectAttempts = useRef(0)
//   const loadingMessage = "Đang tìm kiếm thông tin..."

//   const [sourcesPerMessage, setSourcesPerMessage] = useState<Record<number, string[]>>({})
//   const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
//   const currentBotIndex = useRef<number>(-1)

//   useEffect(() => {
//     const connectWebSocket = () => {
//       const ws = new WebSocket("ws://localhost:8000/chat")

//       ws.onopen = () => {
//         setIsConnected(true)
//         reconnectAttempts.current = 0
//         setSocket(ws)
//       }

//       ws.onmessage = (event: MessageEvent) => {
//         const rawData = event.data

//         if (rawData === "[END]") {
//           setIsLoading(false)
//           return
//         }

//         try {
//           const parsed = JSON.parse(rawData)

//           if (parsed.stream) {
//             botReplyRef.current += parsed.stream
//             setMessages(prev => {
//               const updated = [...prev]
//               updated[updated.length - 1] = `🤖: ${botReplyRef.current}`
//               return updated
//             })
//             if (!hasFirstToken) setHasFirstToken(true)
//           }

//           if (parsed.docs) {
//             const docs = parsed.docs as { source: string; snippet: string }[]
//             const sourcesOnly = docs.map(doc => doc.source).filter((value, index, self) => self.indexOf(value) === index)
//             const idx = currentBotIndex.current
//             setSourcesPerMessage(prev => ({ ...prev, [idx]: sourcesOnly }))
//             onNewSources?.(docs)
//           }

//           if (parsed.suggestions) {
//             setSuggestedQuestions(parsed.suggestions)
//           }
//         } catch {}
//       }

//       ws.onclose = () => {
//         setIsConnected(false)
//         if (reconnectAttempts.current < 5) {
//           const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
//           reconnectAttempts.current++
//           setTimeout(connectWebSocket, delay)
//         }
//       }
//     }

//     connectWebSocket()
//     return () => socket?.close()
//   }, [])

//   useEffect(() => {
//     if (!isLoading || hasFirstToken) return
//     let index = 0
//     const interval = setInterval(() => {
//       setTypingText(loadingMessage.slice(0, index + 1))
//       index = (index + 1) % (loadingMessage.length + 1)
//     }, 100)
//     return () => clearInterval(interval)
//   }, [isLoading, hasFirstToken])

//   useEffect(() => {
//     endRef.current?.scrollIntoView({ behavior: "smooth" })
//   }, [messages])

//   const sendMessage = (msg?: string) => {
//     const question = msg || input
//     if (!question.trim() || !socket || !isConnected || socket.readyState !== 1) return

//     botReplyRef.current = ""
//     const newMessages = [...messages, `🧍: ${question}`, "🤖: "]
//     currentBotIndex.current = newMessages.length - 1
//     setMessages(newMessages)
//     setInput("")
//     setIsLoading(true)
//     setHasFirstToken(false)

//     try {
//       socket.send(JSON.stringify({ message: question }))
//     } catch {
//       setIsLoading(false)
//     }
//   }

//   return (
//     <div className="flex flex-col h-full">
//       <div className="flex-1 overflow-y-auto p-4 space-y-3">
//         {messages.map((msg, i) => (
//           <div key={i} className="p-3 rounded bg-gray-100">
//             <p className="font-semibold text-sm text-gray-700">{msg.startsWith("🤖:") ? "UMP AI:" : "User:"}</p>
//             <p className="whitespace-pre-wrap">
//               {msg.startsWith("🤖:") && isLoading && !hasFirstToken && i === messages.length - 1
//                 ? typingText
//                 : msg.replace(/^(🧍|🤖):\s*/, "")}
//             </p>
//             {msg.startsWith("🤖:") && sourcesPerMessage[i]?.length > 0 && (
//               <div className="mt-2 text-sm text-gray-500">
//                 <p className="font-semibold mb-1">Nguồn tham khảo:</p>
//                 <ul className="list-disc list-inside space-y-1">
//                   {sourcesPerMessage[i].map((src, idx) => (
//                     <li key={idx} className="break-all">{src}</li>
//                   ))}
//                 </ul>
//               </div>
//             )}
//           </div>
//         ))}
//         <div ref={endRef} />
//       </div>

//       <div className="p-4 border-t bg-white flex gap-2">
//         <input
//           className="flex-1 border p-2 rounded"
//           value={input}
//           onChange={(e) => setInput(e.target.value)}
//           onKeyDown={(e) => {
//             if (e.key === "Enter" && !e.shiftKey) {
//               e.preventDefault()
//               sendMessage()
//             }
//           }}
//           placeholder="Nhập câu hỏi..."
//           disabled={!isConnected}
//         />
//         <button
//           className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
//           onClick={() => sendMessage()}
//           disabled={!isConnected || isLoading}
//         >
//           {isLoading ? "Đang xử lý..." : "Gửi"}
//         </button>
//       </div>

//       <div className="p-4 bg-gray-50 border-t">
//         <p className="text-sm text-gray-500 mb-2">💡 Gợi ý:</p>
//         <div className="flex flex-wrap gap-2">
//           {suggestedQuestions.map((q, i) => (
//             <button
//               key={i}
//               onClick={() => sendMessage(q)}
//               className="bg-gray-200 hover:bg-gray-300 text-sm px-3 py-1 rounded disabled:opacity-50"
//               disabled={!isConnected || isLoading}
//             >
//               {q}
//             </button>
//           ))}
//         </div>
//       </div>
//     </div>
//   )
// }
'use client'

import { useState, useEffect, useRef } from "react"

interface ChatUIProps {
  onNewSources?: (docs: string[]) => void
}

export default function ChatUI({ onNewSources }: ChatUIProps) {
  const [messages, setMessages] = useState<string[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [hasFirstToken, setHasFirstToken] = useState(false)
  const [typingText, setTypingText] = useState("")
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const endRef = useRef<HTMLDivElement | null>(null)
  const botReplyRef = useRef("")
  const reconnectAttempts = useRef(0)
  const loadingMessage = "Đang tìm kiếm thông tin..."

  const [sourcesPerMessage, setSourcesPerMessage] = useState<Record<number, string[]>>({})
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
  const currentBotIndex = useRef<number>(-1)

  useEffect(() => {
    const connectWebSocket = () => {
      const ws = new WebSocket("ws://localhost:8000/chat")

      ws.onopen = () => {
        setIsConnected(true)
        reconnectAttempts.current = 0
        setSocket(ws)
      }

      ws.onmessage = (event: MessageEvent) => {
        const rawData = event.data

        if (rawData === "[END]") {
          setIsLoading(false)
          return
        }

        try {
          const parsed = JSON.parse(rawData)

          if (parsed.stream) {
            botReplyRef.current += parsed.stream
            setMessages(prev => {
              const updated = [...prev]
              updated[updated.length - 1] = `🤖: ${botReplyRef.current}`
              return updated
            })
            if (!hasFirstToken) setHasFirstToken(true)
          }

          if (parsed.docs) {
            const docs = parsed.docs as { source: string }[]
            const uniqueSources = Array.from(new Set(docs.map(doc => doc.source)))
            const idx = currentBotIndex.current
            setSourcesPerMessage(prev => ({ ...prev, [idx]: uniqueSources }))
            onNewSources?.(uniqueSources)
          }

          if (parsed.suggestions) {
            setSuggestedQuestions(parsed.suggestions)
          }
        } catch {}
      }

      ws.onclose = () => {
        setIsConnected(false)
        if (reconnectAttempts.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
          reconnectAttempts.current++
          setTimeout(connectWebSocket, delay)
        }
      }
    }

    connectWebSocket()
    return () => socket?.close()
  }, [])

  useEffect(() => {
    if (!isLoading || hasFirstToken) return
    let index = 0
    const interval = setInterval(() => {
      setTypingText(loadingMessage.slice(0, index + 1))
      index = (index + 1) % (loadingMessage.length + 1)
    }, 100)
    return () => clearInterval(interval)
  }, [isLoading, hasFirstToken])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = (msg?: string) => {
    const question = msg || input
    if (!question.trim() || !socket || !isConnected || socket.readyState !== 1) return

    botReplyRef.current = ""
    const newMessages = [...messages, `🧍: ${question}`, "🤖: "]
    currentBotIndex.current = newMessages.length - 1
    setMessages(newMessages)
    setInput("")
    setIsLoading(true)
    setHasFirstToken(false)

    try {
      socket.send(JSON.stringify({ message: question }))
    } catch {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className="p-3 rounded bg-gray-100">
            <p className="font-semibold text-sm text-gray-700">{msg.startsWith("🤖:") ? "UMP AI:" : "User:"}</p>
            <p className="whitespace-pre-wrap">
              {msg.startsWith("🤖:") && isLoading && !hasFirstToken && i === messages.length - 1
                ? typingText
                : msg.replace(/^(🧍|🤖):\s*/, "")}
            </p>
            {msg.startsWith("🤖:") && sourcesPerMessage[i]?.length > 0 && (
              <div className="mt-2 text-sm text-gray-500">
                <p className="font-semibold mb-1">Nguồn tham khảo:</p>
                <ul className="list-disc list-inside space-y-1">
                  {sourcesPerMessage[i].map((src, idx) => (
                    <li key={idx} className="break-all">{src}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="p-4 border-t bg-white flex gap-2">
        <input
          className="flex-1 border p-2 rounded"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              sendMessage()
            }
          }}
          placeholder="Nhập câu hỏi..."
          disabled={!isConnected}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          onClick={() => sendMessage()}
          disabled={!isConnected || isLoading}
        >
          {isLoading ? "Đang xử lý..." : "Gửi"}
        </button>
      </div>

      <div className="p-4 bg-gray-50 border-t">
        <p className="text-sm text-gray-500 mb-2">💡 Gợi ý:</p>
        <div className="flex flex-wrap gap-2">
          {suggestedQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => sendMessage(q)}
              className="bg-gray-200 hover:bg-gray-300 text-sm px-3 py-1 rounded disabled:opacity-50"
              disabled={!isConnected || isLoading}
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
