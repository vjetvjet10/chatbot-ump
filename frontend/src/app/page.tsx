

// 'use client'

// import { useState, useEffect, useRef } from 'react'
// import dynamic from 'next/dynamic'
// import { PaperAirplaneIcon, MicrophoneIcon, DocumentIcon } from '@heroicons/react/24/solid'

// const PdfPreview = dynamic(() => import('../components/PdfPreview'), { ssr: false })

// interface Message {
//   role: 'user' | 'assistant'
//   content: string
// }
// interface SourceGroup {
//   source: string
//   highlights: string[]
// }

// export default function Home() {
//   const [messages, setMessages] = useState<Message[]>([])
//   const [input, setInput] = useState("")
//   const [sources, setSources] = useState<SourceGroup[]>([])
//   const [suggestions, setSuggestions] = useState<string[]>([])
//   const [isTyping, setIsTyping] = useState(false)
//   const [typingDots, setTypingDots] = useState("")
//   const [sidebarOpen, setSidebarOpen] = useState(false)
//   const [showAllHighlights, setShowAllHighlights] = useState(false)
//   const [isRecording, setIsRecording] = useState(false)
//   const [showViewer, setShowViewer] = useState(false)
//   const [isFirstLoad, setIsFirstLoad] = useState(true);
//   const maxHighlights = 5
//   const socketRef = useRef<WebSocket | null>(null)
//   const mediaRecorderRef = useRef<MediaRecorder | null>(null)
//   const audioChunksRef = useRef<Blob[]>([])
//   const inputRef = useRef<HTMLTextAreaElement>(null)
//   const bottomRef = useRef<HTMLDivElement | null>(null)
//   const currentAssistantMessageRef = useRef<string>("") // Thêm ref này

//   const toggleSidebar = () => setSidebarOpen(prev => !prev)

//   useEffect(() => {
//     const socket = new WebSocket(`ws://${window.location.hostname}:8000/chat`)
//     socketRef.current = socket
//     socket.onmessage = (event) => {
//       // --- BẮT ĐẦU DEBUG ---
//       // Luôn log dữ liệu thô nhận được để chắc chắn backend không gửi lặp
//       console.log("Raw WebSocket Data:", event.data);
//       // --- KẾT THÚC DEBUG ---

//       if (event.data === "[END]") {
//         setIsTyping(false)
//         currentAssistantMessageRef.current = ""; // Reset ref khi kết thúc
//         return
//       }

//       let data: any;
//       try {
//         data = JSON.parse(event.data);
//       } catch {
//         // Nếu không phải JSON (ví dụ: blob âm thanh), bỏ qua phần xử lý JSON
//         // Quan trọng: Đảm bảo không có dữ liệu text nào bị bỏ lỡ nếu backend gửi text không phải JSON
//         console.log("Non-JSON message received:", event.data);
//         return;
//       }

//       // --- XỬ LÝ STREAMMING ĐÃ SỬA ---
//       if (data.stream) {
//         // 1. Nối chunk mới vào ref
//         currentAssistantMessageRef.current += data.stream;

//         // 2. Cập nhật state messages
//         setMessages(prev => {
//           const updated = [...prev];
//           if (updated.length === 0 || updated[updated.length - 1]?.role !== 'assistant') {
//             // Bắt đầu tin nhắn mới: Đặt nội dung là toàn bộ ref hiện tại
//             updated.push({ role: 'assistant', content: currentAssistantMessageRef.current.trimStart() });
//           } else {
//             // Cập nhật tin nhắn cuối: Gán bằng toàn bộ nội dung ref hiện tại
//             updated[updated.length - 1].content = currentAssistantMessageRef.current;
//           }
//           return updated;
//         });
//       }
//       // --- KẾT THÚC SỬA STREAMING ---

//       else if (data.type === 'replace_ai_message') {
//         // Khi thay thế toàn bộ, cũng cập nhật ref
//         currentAssistantMessageRef.current = data.new_answer.trim();
//         setMessages(prev => {
//           const last = prev[prev.length - 1];
//           if (last?.role === 'assistant') {
//             // Thay thế tin nhắn cuối
//             return [...prev.slice(0, -1), { role: 'assistant', content: currentAssistantMessageRef.current }];
//           } else {
//             // Thêm tin nhắn mới nếu không có tin nhắn assistant ở cuối
//             return [...prev, { role: 'assistant', content: currentAssistantMessageRef.current }];
//           }
//         });
//         // Có thể cần reset isTyping nếu replace_ai_message là dấu hiệu kết thúc
//         // setIsTyping(false); // Xem xét logic backend của bạn
//       }

//       else if (data.type === 'metadata') {
//         // Xử lý metadata không đổi...
//         const grouped = new Map<string, string[]>()
//         for (const s of data.sources || []) {
//           const file = String(s.source)
//           const highlight = s.highlight || ""
//           if (!grouped.has(file)) grouped.set(file, [highlight])
//           else grouped.get(file)!.push(highlight)
//         }
//         const groupedArray = Array.from(grouped.entries()).map(([source, highlights]) => ({ source, highlights }))
//         setSources(groupedArray)
//         if (data.suggestions) setSuggestions(data.suggestions)
//       }

//       else if (data.type === 'recognized_text') {
//         // DEBUG: Xem backend gửi gì
//         console.log('Received recognized_text data:', data);
    
//         // Giả sử backend đã được sửa và data.text chứa bản ghi giọng nói thô
//         const recognized = data.text.trim();
    
//         // --- TỰ ĐỘNG GỬI KHI CÓ KẾT QUẢ NHẬN DẠNG ---
//         if (recognized && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
//           // 1. Thêm tin nhắn User vào messages ngay lập tức
//           const newMessages = [...messages, { role: 'user', content: recognized }];
//           setMessages(newMessages);
    
//           // 2. Chuẩn bị và gửi payload tới backend
//           const payload = {
//             query: recognized,
//             // Lấy lịch sử BAO GỒM cả tin nhắn user vừa thêm
//             history: newMessages.slice(-4)
//           };
//           socketRef.current.send(JSON.stringify(payload));
    
//           // 3. Đặt trạng thái đang chờ AI trả lời
//           setIsTyping(true);
    
//           // 4. Xóa nội dung ô input (vì đã gửi)
//           setInput("");
//           // Reset chiều cao textarea nếu cần
//           if (inputRef.current) {
//               inputRef.current.style.height = 'auto';
//           }
    
//           // 5. Reset các state khác như sources, suggestions
//           setSources([]);
//           setSuggestions([]);
//           currentAssistantMessageRef.current = ""; // Reset nội dung AI đang xây dựng
    
//         } else if (recognized) {
//            // Chỉ cập nhật input nếu có text nhưng socket không sẵn sàng
//            setInput(recognized);
//            if (inputRef.current) {
//              inputRef.current.style.height = 'auto';
//              inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
//            }
//            inputRef.current?.focus();
//         } else {
//            // Xử lý trường hợp không nhận dạng được gì (recognized rỗng)
//            console.log("Recognition returned empty text.");
//            // Có thể hiển thị thông báo nhỏ hoặc không làm gì cả
//         }
//       }
//       if (data.final) {
//         setIsTyping(false)
//       }

//     //   if (data.error) {
//     //     setMessages(prev => [...prev, { role: 'assistant', content: `❌ Lỗi: ${data.error}` }])
//     //     setIsTyping(false)
//     //   }
//     // }
//     else if (data.error) {
//       setMessages(prev => [...prev, { role: 'assistant', content: `❌ Lỗi: ${data.error}` }])
//       setIsTyping(false)
//       currentAssistantMessageRef.current = ""; // Reset ref khi có lỗi
//     }
//   }

//     socket.onclose = () => setIsTyping(false)

//     return () => socket.close()
//   }, [])

// // Quan trọng: Reset ref khi gửi tin nhắn mới
//     const handleSubmit = () => {
//       if (!input.trim() || !socketRef.current) return
//       setIsFirstLoad(false);
//       const question = input.trim()

//       const updatedMessages = [...messages, { role: 'user', content: question }]
//       setMessages(updatedMessages)

//       const payload = {
//         query: question,
//         history: updatedMessages.slice(-4) // Gửi lịch sử *trước khi* AI trả lời
//       }

//       socketRef.current.send(JSON.stringify(payload))
//       setInput("")
//       // Reset chiều cao textarea
//       if (inputRef.current) {
//           inputRef.current.style.height = 'auto';
//       }
//       setIsTyping(true)
//       setSources([])
//       setSuggestions([])
//       inputRef.current?.focus()
//       currentAssistantMessageRef.current = ""; // <-- RESET REF Ở ĐÂY
//     }

//   const startRecording = async () => {
//     if (typeof window === 'undefined' || !navigator.mediaDevices) {
//       console.error("🎙️ Recording not supported")
//       return
//     }
//     const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
//     const mediaRecorder = new MediaRecorder(stream)
//     mediaRecorderRef.current = mediaRecorder
//     audioChunksRef.current = []

//     mediaRecorder.ondataavailable = (e) => {
//       audioChunksRef.current.push(e.data)
//     }

//     mediaRecorder.onstop = async () => {
//       const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
//       if (socketRef.current?.readyState === WebSocket.OPEN) {
//         socketRef.current.send(audioBlob)
//       }
//     }

//     mediaRecorder.start()
//     setIsRecording(true)
//   }

//   const stopRecording = () => {
//     if (mediaRecorderRef.current?.state === "recording") {
//       mediaRecorderRef.current.stop()
//       setIsRecording(false)
//     }
//   }

//   useEffect(() => {
//     if (!isTyping) return
//     const interval = setInterval(() => {
//       setTypingDots(prev => (prev.length >= 3 ? "" : prev + "."))
//     }, 500)
//     return () => clearInterval(interval)
//   }, [isTyping])

//   useEffect(() => {
//     bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
//   }, [messages, isTyping])

//   return (
//     <div className="flex flex-col w-screen min-h-[100dvh]">
//       <header className="sticky top-0 z-50 bg-blue-600 text-white p-3 flex justify-between items-center">
//         <div className="flex items-center gap-3">
//           <button onClick={toggleSidebar} className="text-white flex flex-col items-center gap-0 text-xs whitespace-normal md:hidden">
//             <DocumentIcon className="w-5 h-5" />
//             <span>Nguồn tài liệu</span>
//           </button>
//           </div>
//           {/* <div className="w-px h-6 bg-white/80 opacity-50"></div>
//           <div className="font-semibold text-sm">UMP AI chat</div> */}
//             <div className="flex items-center ml-auto">
//             <div className="font-semibold text-sm">UMP AI chat</div>
//         </div>
//         <div className="text-xs">🟢</div>
//       </header>

//       <div className="flex flex-1 min-h-0 overflow-hidden">

//           <aside className={`bg-gray-100 flex-shrink-0 w-full md:w-1/5 overflow-hidden ${sidebarOpen ? '' : 'hidden'} md:block`}>
//             {/* <div className="flex flex-col h-full"> */}
//             <div className="flex flex-col min-h-0 overflow-hidden">

//               {/* 🔹 Trên: Khung thông tin tài liệu */}
//               <div className="p-3 border-b space-y-2">
//                 <h2 className="text-base font-semibold mb-2">📄 Tài liệu</h2>

//                 {sources.length > 0 ? (
//                   sources[0].source.startsWith("http") ? (
//                     <div className="space-y-2">
//                       <div className="text-sm">
//                         <div className="font-medium text-blue-700">{new URL(sources[0].source).hostname}</div>
//                         <button
//                           onClick={() => setShowViewer(prev => !prev)}
//                           className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
//                         >
//                           {showViewer ? "Đóng link" : "Xem link"}
//                         </button>
//                       </div>
//                       {showViewer && (
//                         <div className="mt-2 h-40 overflow-auto border rounded">
//                           <iframe
//                             src={sources[0].source}
//                             className="w-full h-full"
//                             title="Link Preview"
//                           />
//                         </div>
//                       )}
//                     </div>
//                   ) : (
//                     <div className="space-y-2">
//                       <div className="text-sm">
//                         <div className="font-medium text-gray-700 break-words">
//                           {decodeURIComponent(sources[0].source).replace(".docx", ".pdf")}
//                         </div>
//                         <button
//                           onClick={() => setShowViewer(prev => !prev)}
//                           className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
//                         >
//                           {showViewer ? "Đóng file" : "Xem file"}
//                         </button>
//                       </div>
//                       {showViewer && (
//                         <div className="mt-2 h-40 overflow-auto border rounded">
//                           <PdfPreview fileUrl={`/files/${String(sources[0].source).replace(/\\.docx$/i, ".pdf")}`} />
//                         </div>
//                       )}
//                     </div>
//                   )
//                 ) : (
//                   <p className="text-sm text-gray-500">Chưa có tài liệu nào được chọn.</p>
//                 )}
//               </div>

//               {/* 🔹 Dưới: Highlights cuộn giới hạn */}
//               <div className="flex-1 p-3 space-y-2">
//                 <h3 className="text-sm font-medium mb-2 text-gray-800">🔍 Trích dẫn liên quan</h3>

//                 {sources.length === 0 ? (
//                   <p className="text-sm text-gray-500">Không có đoạn trích.</p>
//                 ) : (
//                   <div className="border rounded p-2 h-60 overflow-y-auto space-y-2">
//                     <ul className="space-y-2 text-sm">
//                       {sources
//                         .flatMap(item =>
//                           item.highlights.map((highlight, idx) => ({
//                             source: item.source,
//                             text: highlight,
//                             index: idx,
//                           }))
//                         )
//                         .slice(0, showAllHighlights ? undefined : 5)
//                         .map((item, idx) => (
//                           <li
//                             key={idx}
//                             className="bg-yellow-50 border-l-4 border-yellow-400 p-2 rounded text-gray-800 whitespace-pre-wrap"
//                           >
//                             <span className="text-yellow-700 text-xs block mb-1">📘 {item.source}</span>
//                             “ {item.text}
//                           </li>
//                         ))}
//                     </ul>

//                     {sources.flatMap(s => s.highlights).length > 5 && (
//                       <button
//                         className="mt-2 text-xs text-blue-600 hover:underline"
//                         onClick={() => setShowAllHighlights(prev => !prev)}
//                       >
//                         {showAllHighlights ? "🔽 Thu gọn" : "▶️ Xem thêm"}
//                       </button>
//                     )}
//                   </div>
//                 )}
//               </div>


//             </div>
//           </aside>

//         {/* Cột giữa: Khung chat */}
//         <div className="flex flex-col flex-1 min-w-0 min-h-0 bg-white">
//           <div className="flex-1 overflow-y-auto p-4 space-y-2 pt-2 pb-28">
//           {isFirstLoad ? (
//           // <div className="flex flex-col items-center justify-center text-center space-y-6 pt-10">
//           <div className="flex flex-col items-center justify-center text-center space-y-6 h-full rounded-lg p-10"> 
//           <h2 className="text-3xl font-bold text-blue-700">UMP xin chào!</h2>
//             {/* <p className="text-gray-600">Bạn muốn hỏi về điều gì?</p> */}
//             <div className="flex flex-col items-center gap-2 mt-4">
//               {[
//                 "Học phí ngành Y khoa năm 2025?",
//                 "Các phương thức tuyển sinh?",
//                 "Thời gian nộp chứng chỉ IELTS?"
//               ].map((suggestion, idx) => (
//                 <button
//                   key={idx}
//                   onClick={() => {
//                     setInput(suggestion);
//                     setIsFirstLoad(false);
//                     setTimeout(() => handleSubmit(), 100); // delay nhẹ để tránh lỗi input chưa set
//                   }}
//                   // className="px-5 py-2 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 text-sm"
//                   className="px-4 py-2 bg-white text-blue-700 rounded-full border border-blue-300 hover:bg-blue-500 hover:text-white hover:scale-105 transform transition duration-300 text-sm"

//                 >
//                   {suggestion}
//                 </button>
//               ))}
//             </div>
//           </div>
//         ) : (
//           messages.map((msg, idx) => {
//             const isUser = msg.role === 'user';
//             const isAI = msg.role === 'assistant';
//             const content = msg.content;
//             return (
//               <div key={idx} className={`p-2 rounded-md whitespace-pre-wrap ${isUser ? "bg-blue-50 text-blue-900" : isAI ? "bg-gray-100 text-gray-800" : ""}`}>
//                 <strong>{isUser ? "User: " : isAI ? "UMP AI: " : ""}</strong>{content}
//               </div>
//             )
//           })
//         )}

//             {isTyping && <div className="text-sm text-gray-500">🤖 Đang soạn câu trả lời{typingDots}</div>}

//             {/* Gợi ý câu hỏi dưới nội dung chat */}
//             {suggestions.length > 0 && (
//               <div className="mt-4 px-4 py-2 bg-gray-50 rounded-lg border text-sm">
//                 <div className="font-medium mb-1">💡 Câu hỏi gợi ý:</div>
//                 <div className="flex flex-wrap gap-2">
//                   {suggestions.map((sugg, idx) => (
//                     <button
//                       key={idx}
//                       onClick={() => setInput(sugg)}
//                       className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 text-xs"
//                     >
//                       {sugg}
//                     </button>
//                   ))}
//                 </div>
//               </div>
//             )}
//             <div ref={bottomRef} />
//           </div>

//           {/* Ô nhập câu hỏi */}
//           {/* <div className="border-0 p-3 pb-8 bg-white">
//           <div className="relative flex items-end w-full"> */}
            
//             {/* <textarea
//               value={input}
//               onChange={e => setInput(e.target.value)}
//               onInput={e => {
//                 const target = e.target as HTMLTextAreaElement;
//                 target.style.height = 'auto';
//                 target.style.height = `${target.scrollHeight}px`;
//               }}
//               onKeyDown={e => {
//                 if (e.key === 'Enter' && !e.shiftKey) {
//                   e.preventDefault();
//                   handleSubmit();
//                 }
//               }}
//               placeholder="Hỏi về UMP..."
//               // className="flex-1 w-full max-w-full min-w-0 border border-gray-300 rounded-3xl shadow-sm px-6 py-4 text-base text-blue-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white resize-none overflow-hidden leading-tight break-words pr-16 max-h-40"
//               className="flex-1 max-w-[calc(100%-1cm)] mr-[1cm] border border-gray-300 rounded-3xl shadow-sm px-6 py-4 text-base text-blue-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white resize-none overflow-hidden leading-tight break-words pr-16 max-h-40"
//               rows={1}
//             />
//             <button 
//               onClick={isRecording ? stopRecording : startRecording} 
//               className="absolute bottom-2 right-12 bg-gray-100 text-gray-700 p-2 rounded-full hover:bg-gray-200">
//               <MicrophoneIcon className={`w-5 h-5 ${isRecording ? 'text-red-500 animate-ping' : ''}`} />
//             </button>
//             {/* ✈️ Nút gửi nằm ngoài khung nhập */}
//             {/* </div> */}
//             {/* <button */}
//               {/* onClick={handleSubmit} */}
//               {/* className="ml-210 bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700" */}
//             {/* > */}
//               {/* <PaperAirplaneIcon className="w-5 h-5 rotate-270" /> */}
//             {/* </button> */}
//             <div className="p-3 pb-8 bg-white">
//             <div className="flex items-end w-full relative">
              
//               {/* Ô nhập câu hỏi */}
//               <textarea
//                 value={input}
//                 onChange={e => setInput(e.target.value)}
//                 onInput={e => {
//                   const target = e.target as HTMLTextAreaElement;
//                   target.style.height = 'auto';
//                   target.style.height = `${target.scrollHeight}px`;
//                 }}
//                 onKeyDown={e => {
//                   if (e.key === 'Enter' && !e.shiftKey) {
//                     e.preventDefault();
//                     handleSubmit();
//                   }
//                 }}
//                 placeholder="Hỏi UMP AI chat..."
//                 className="flex-1 w-full border border-gray-300 rounded-3xl shadow-sm px-4 py-4 text-base text-blue-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white resize-none overflow-hidden leading-tight break-words pr-16 max-h-40"
//                 rows={1}
//               />

//               {/* Nút Microphone */}
//               <button 
//                 onClick={isRecording ? stopRecording : startRecording}
//                 className="absolute bottom-1 right-15 p-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
//               >
//                 <MicrophoneIcon className={`w-5 h-5 ${isRecording ? 'text-red-500 animate-ping' : ''}`} />
//               </button>

//               {/* Nút Gửi */}
//               <button
//                 onClick={handleSubmit}
//                 className="ml-2 mb-1 p-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
//               >
//                 <PaperAirplaneIcon className="w-6 h-6 rotate-270" />
//               </button>

//             </div>
//             <div className="mt-6 text-center text-xs text-gray-500 px-4">
//             UMP AI chat có thể mắc sai sót, hãy liên hệ Nhà trường nếu cần xác minh câu trả lời.
//           </div>
//           </div>
//           </div>
//         {/* Cột phải: Thông tin lưu ý */}
//         <aside className="bg-gray-50 flex-shrink-0 w-full md:w-1/5 overflow-y-auto hidden md:block p-3 text-sm text-gray-600">
//           <h3 className="font-semibold mb-2">🔹 Lưu ý</h3>
//           <ul className="list-disc pl-5 space-y-1">
//             <li>📌 Đây là hệ thống tư vấn AI 24/7 của Đại học Y Dược TPHCM</li>
//             <li>📌 Dữ liệu được cung cấp từ Phòng Đào tạo đại học và Phòng Công tác sinh viên ĐHYD TPHCM</li>
//             <li>📌 Một số câu hỏi hệ thống sẽ tìm kiếm trên internet nếu thiếu dữ liệu, người dùng nên kiểm tra nguồn chính thống.</li>
//           </ul>
//           <hr className="my-4" />
//           <p className="text-xs text-gray-400">Phiên bản AI tư vấn ĐHYD TPHCM.</p>
//         </aside>

//       </div> 
//     </div>  
//   )
// }



'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { PaperAirplaneIcon, MicrophoneIcon, DocumentIcon } from '@heroicons/react/24/solid'

const PdfPreview = dynamic(() => import('../components/PdfPreview'), { ssr: false })

interface Message {
  role: 'user' | 'assistant'
  content: string
}
interface SourceGroup {
  source: string
  highlights: string[]
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [sources, setSources] = useState<SourceGroup[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [typingDots, setTypingDots] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showAllHighlights, setShowAllHighlights] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [showViewer, setShowViewer] = useState(false)
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  // const maxHighlights = 5
  const socketRef = useRef<WebSocket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const currentAssistantMessageRef = useRef<string>("") // Thêm ref này

  const toggleSidebar = () => setSidebarOpen(prev => !prev)

  useEffect(() => {
    const socket = new WebSocket(`ws://${window.location.hostname}:8000/chat`);
    socketRef.current = socket;
    socket.onmessage = (event) => {
      // --- BẮT ĐẦU DEBUG ---
      // Luôn log dữ liệu thô nhận được để chắc chắn backend không gửi lặp
      console.log("Raw WebSocket Data:", event.data);
      // --- KẾT THÚC DEBUG ---

      if (event.data === "[END]") {
        setIsTyping(false)
        currentAssistantMessageRef.current = ""; // Reset ref khi kết thúc
        return
      }

      // let data: any;
      let data: unknown;
      try {
        data = JSON.parse(event.data);
      } catch {
        // Nếu không phải JSON (ví dụ: blob âm thanh), bỏ qua phần xử lý JSON
        // Quan trọng: Đảm bảo không có dữ liệu text nào bị bỏ lỡ nếu backend gửi text không phải JSON
        console.log("Non-JSON message received:", event.data);
        return;
      }

      // --- XỬ LÝ STREAMMING ĐÃ SỬA ---
      // if (data.stream) {
        if (typeof data === 'object' && data !== null && 'stream' in data) {
          const streamData = data as { stream: string };
        // 1. Nối chunk mới vào ref
        currentAssistantMessageRef.current += streamData.stream;

        // 2. Cập nhật state messages
        setMessages(prev => {
          const updated = [...prev];
          if (updated.length === 0 || updated[updated.length - 1]?.role !== 'assistant') {
            // Bắt đầu tin nhắn mới: Đặt nội dung là toàn bộ ref hiện tại
            updated.push({ role: 'assistant' as const, content: currentAssistantMessageRef.current.trimStart() });
          } else {
            // Cập nhật tin nhắn cuối: Gán bằng toàn bộ nội dung ref hiện tại
            updated[updated.length - 1].content = currentAssistantMessageRef.current;
          }
          return updated;
        });
      }
      // --- KẾT THÚC SỬA STREAMING ---

      // else if (data.type === 'replace_ai_message') {
        else if (typeof data === 'object' && data !== null && 'type' in data && (data as Record<string, unknown>).type === 'replace_ai_message') {
          const replaceData = data as { type: string; new_answer: string };
        // Khi thay thế toàn bộ, cũng cập nhật ref
        currentAssistantMessageRef.current = replaceData.new_answer.trim();
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            // Thay thế tin nhắn cuối
            return [...prev.slice(0, -1), { role: 'assistant', content: currentAssistantMessageRef.current }];
          } else {
            // Thêm tin nhắn mới nếu không có tin nhắn assistant ở cuối
            return [...prev, { role: 'assistant', content: currentAssistantMessageRef.current }];
          }
        });
        // Có thể cần reset isTyping nếu replace_ai_message là dấu hiệu kết thúc
        // setIsTyping(false); // Xem xét logic backend của bạn
      }

      // else if (data.type === 'metadata') {
      //   // Xử lý metadata không đổi...
      //   const grouped = new Map<string, string[]>()
      //   for (const s of data.sources || []) {
      //     const file = String(s.source)
      //     const highlight = s.highlight || ""
      //     if (!grouped.has(file)) grouped.set(file, [highlight])
      //     else grouped.get(file)!.push(highlight)
      //   }
      //   const groupedArray = Array.from(grouped.entries()).map(([source, highlights]) => ({ source, highlights }))
      //   setSources(groupedArray)
      //   if (data.suggestions) setSuggestions(data.suggestions)
      // }
      else if (
        typeof data === 'object' &&
        data !== null &&
        'type' in data &&
        (data as Record<string, unknown>).type === 'metadata'
      ) {
        const metadata = data as {
          type: string;
          sources?: { source: string; highlight: string }[];
          suggestions?: string[];
        };
      
        const grouped = new Map<string, string[]>();
        for (const s of metadata.sources || []) {
          const file = String(s.source);
          const highlight = s.highlight || '';
          if (!grouped.has(file)) grouped.set(file, [highlight]);
          else grouped.get(file)!.push(highlight);
        }
      
        const groupedArray = Array.from(grouped.entries()).map(([source, highlights]) => ({
          source,
          highlights,
        }));
      
        setSources(groupedArray);
        if (metadata.suggestions) setSuggestions(metadata.suggestions);
      }
      
      // else if (data.type === 'recognized_text') {
      //   // DEBUG: Xem backend gửi gì
      //   console.log('Received recognized_text data:', data);
    
      //   // Giả sử backend đã được sửa và data.text chứa bản ghi giọng nói thô
      //   const recognized = data.text.trim();
      else if (
        typeof data === 'object' &&
        data !== null &&
        'type' in data &&
        (data as Record<string, unknown>).type === 'recognized_text'
      ) {
        const recognizedData = data as { type: string; text: string };
      
        // DEBUG: Xem backend gửi gì
        console.log('Received recognized_text data:', recognizedData);
      
        const recognized = recognizedData.text.trim();
        // --- TỰ ĐỘNG GỬI KHI CÓ KẾT QUẢ NHẬN DẠNG ---
      //   if (recognized && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      //     // === SỬA LỖI: Đảm bảo chuyển sang màn hình chat ===
      //     setIsFirstLoad(false); // <-- THÊM DÒNG NÀY
      //     // 1. Thêm tin nhắn User vào messages ngay lập tức
      //     // const newMessages = [...messages, { role: 'user', content: recognized }];
      //     // setMessages(newMessages);
      //     setMessages(prev => [...prev, { role: 'user', content: recognized }]);
    
      //     // 2. Chuẩn bị và gửi payload tới backend
      //     const payload = {
      //       query: recognized,
      //       // Lấy lịch sử BAO GỒM cả tin nhắn user vừa thêm
      //       history: newMessages.slice(-4)
      //     };
      //     socketRef.current.send(JSON.stringify(payload));
    
      //     // 3. Đặt trạng thái đang chờ AI trả lời
      //     setIsTyping(true);
    
      //     // 4. Xóa nội dung ô input (vì đã gửi)
      //     setInput("");
      //     // Reset chiều cao textarea nếu cần
      //     if (inputRef.current) {
      //         inputRef.current.style.height = 'auto';
      //     }
    
      //     // 5. Reset các state khác như sources, suggestions
      //     setSources([]);
      //     setSuggestions([]);
      //     currentAssistantMessageRef.current = ""; // Reset nội dung AI đang xây dựng
    
      //   } else if (recognized) {
      //      // Chỉ cập nhật input nếu có text nhưng socket không sẵn sàng
      //      setInput(recognized);
      //      if (inputRef.current) {
      //        inputRef.current.style.height = 'auto';
      //        inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
      //      }
      //      inputRef.current?.focus();
      //   } else {
      //      // Xử lý trường hợp không nhận dạng được gì (recognized rỗng)
      //      console.log("Recognition returned empty text.");
      //      // Có thể hiển thị thông báo nhỏ hoặc không làm gì cả
      //   }
      // }
      if (recognized && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        setIsFirstLoad(false);
    
        setMessages(prev => {
          const updated = [...prev, { role: 'user' as const, content: recognized }];
          const payload = {
            query: recognized,
            history: updated.slice(-4),
          };
    
          socketRef.current?.send(JSON.stringify(payload));
          return updated;
        });
    
        setIsTyping(true);
        setInput("");
        if (inputRef.current) inputRef.current.style.height = 'auto';
        setSources([]);
        setSuggestions([]);
        currentAssistantMessageRef.current = "";
      } else if (recognized) {
        setInput(recognized);
        if (inputRef.current) {
          inputRef.current.style.height = 'auto';
          inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
        }
        inputRef.current?.focus();
      } else {
        console.log("Recognition returned empty text.");
      }
    }
      // if (data.final) {
      //   setIsTyping(false)
      // }
      if (
        typeof data === 'object' &&
        data !== null &&
        'final' in data &&
        (data as Record<string, unknown>).final === true
      ) {
        setIsTyping(false);
      }
      
    //   if (data.error) {
    //     setMessages(prev => [...prev, { role: 'assistant', content: `❌ Lỗi: ${data.error}` }])
    //     setIsTyping(false)
    //   }
    // }
  //   else if (data.error) {
  //     setMessages(prev => [...prev, { role: 'assistant', content: `❌ Lỗi: ${data.error}` }])
  //     setIsTyping(false)
  //     currentAssistantMessageRef.current = ""; // Reset ref khi có lỗi
  //   }
  // }
  else if (
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    typeof (data as Record<string, unknown>).error === 'string'
  ) {
    const errorData = data as { error: string };
    setMessages(prev => [...prev, { role: 'assistant', content: `❌ Lỗi: ${errorData.error}` }]);
    setIsTyping(false);
    currentAssistantMessageRef.current = ""; // Reset ref khi có lỗi
  }
  
    socket.onclose = () => setIsTyping(false);

    return () => socket.close();
}
  }, []);

// Quan trọng: Reset ref khi gửi tin nhắn mới
    const handleSubmit = () => {
      if (!input.trim() || !socketRef.current) return
      setIsFirstLoad(false);
      const question = input.trim()

      const updatedMessages = [...messages, { role: 'user' as const, content: question }]
      setMessages(updatedMessages)

      const payload = {
        query: question,
        history: updatedMessages.slice(-4) // Gửi lịch sử *trước khi* AI trả lời
      }

      socketRef.current.send(JSON.stringify(payload))
      setInput("")
      // Reset chiều cao textarea
      if (inputRef.current) {
          inputRef.current.style.height = 'auto';
      }
      setIsTyping(true)
      setSources([])
      setSuggestions([])
      inputRef.current?.focus()
      currentAssistantMessageRef.current = ""; // <-- RESET REF Ở ĐÂY
    }

  const startRecording = async () => {
    if (typeof window === 'undefined' || !navigator.mediaDevices) {
      console.error("🎙️ Recording not supported")
      return
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mediaRecorder = new MediaRecorder(stream)
    mediaRecorderRef.current = mediaRecorder
    audioChunksRef.current = []

    mediaRecorder.ondataavailable = (e) => {
      audioChunksRef.current.push(e.data)
    }

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(audioBlob)
      }
    }

    mediaRecorder.start()
    setIsRecording(true)
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  useEffect(() => {
    if (!isTyping) return
    const interval = setInterval(() => {
      setTypingDots(prev => (prev.length >= 3 ? "" : prev + "."))
    }, 500)
    return () => clearInterval(interval)
  }, [isTyping])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  return (
    <div className="flex w-screen min-h-screen bg-gray-50">
      {/* Sidebar trái */}
      
      <aside className={`bg-gray-100 flex-shrink-0 w-full md:w-1/5 overflow-hidden ${sidebarOpen ? '' : 'hidden'} md:block`}>
      <div className="flex flex-col min-h-0 overflow-hidden">
    {/* 🔴 Thêm nút Đóng Sidebar (chỉ hiện khi mobile) */}
    <div className="flex justify-end p-2 md:hidden">
      <button
        onClick={() => setSidebarOpen(false)}
        className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
      >
        ✖ Đóng
      </button>
    </div>

    {/* 🔹 Khung tài liệu */}
    <div className="p-3 border-b space-y-2">
      <h2 className="text-base font-semibold mb-2">📄 Tài liệu</h2>

      {sources.length > 0 ? (
        sources[0].source.startsWith("http") ? (
          <div className="space-y-2">
            <div className="text-sm">
              <div className="font-medium text-blue-700">{new URL(sources[0].source).hostname}</div>
              <button
                onClick={() => setShowViewer(prev => !prev)}
                className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
              >
                {showViewer ? "Đóng link" : "Xem link"}
              </button>
            </div>
            {showViewer && (
              <div className="mt-2 h-40 overflow-auto border rounded">
                <iframe
                  src={sources[0].source}
                  className="w-full h-full"
                  title="Link Preview"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-sm">
              <div className="font-medium text-gray-700 break-words">
                {decodeURIComponent(sources[0].source).replace(".docx", ".pdf")}
              </div>
              <button
                onClick={() => setShowViewer(prev => !prev)}
                className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
              >
                {showViewer ? "Đóng file" : "Xem file"}
              </button>
            </div>
            {showViewer && (
              <div className="mt-2 h-40 overflow-auto border rounded">
                <PdfPreview fileUrl={`/files/${String(sources[0].source).replace(/\\.docx$/i, ".pdf")}`} />
              </div>
            )}
          </div>
        )
      ) : (
        <p className="text-sm text-gray-500">Chưa có tài liệu nào được chọn.</p>
      )}
    </div>

    {/* 🔹 Trích dẫn */}
    <div className="flex-1 p-3 space-y-2">
      <h3 className="text-sm font-medium mb-2 text-gray-800">🔍 Trích dẫn liên quan</h3>

      {sources.length === 0 ? (
        <p className="text-sm text-gray-500">Không có đoạn trích.</p>
      ) : (
        <div className="border rounded p-2 h-60 overflow-y-auto space-y-2">
          <ul className="space-y-2 text-sm">
            {sources
              .flatMap(item =>
                item.highlights.map((highlight, idx) => ({
                  source: item.source,
                  text: highlight,
                  index: idx,
                }))
              )
              .slice(0, showAllHighlights ? undefined : 5)
              .map((item, idx) => (
                <li
                  key={idx}
                  className="bg-yellow-50 border-l-4 border-yellow-400 p-2 rounded text-gray-800 whitespace-pre-wrap"
                >
                  <span className="text-yellow-700 text-xs block mb-1">📘 {item.source}</span>
                  “ {item.text}
                </li>
              ))}
          </ul>

          {sources.flatMap(s => s.highlights).length > 5 && (
            <button
              className="mt-2 text-xs text-blue-600 hover:underline"
              onClick={() => setShowAllHighlights(prev => !prev)}
            >
              {showAllHighlights ? "🔽 Thu gọn" : "▶️ Xem thêm"}
            </button>
          )}
        </div>
      )}
    </div>

  </div>

        {/* nội dung sidebar tài liệu */}
      </aside>

      {/* Cột giữa */}
      <main className="flex flex-col flex-1">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-blue-600 text-white h-16 flex justify-center items-center px-4">
          <div className="flex items-center w-full justify-between">
            <button onClick={toggleSidebar} className="flex flex-col text-xs items-center md:hidden">
              <DocumentIcon className="w-5 h-5" />
              <span className="text-xs">Nguồn tài liệu</span>
            </button>
            <img src="/logo/logo_full.png" alt="UMP" className="h-14 object-contain" />
            {/* <div className="text-xs font-semibold">UMP AI Chat</div> */}
            <div className="text-xs">🟢</div>
          </div>
        </header>

        {/* Nội dung chính */}
        <section className="flex flex-col h-[calc(100vh-4rem)] bg-white">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isFirstLoad ? (
              <div className="flex flex-col items-center justify-center text-center space-y-4 pt-20">
                <h2 className="text-3xl font-bold text-blue-700">UMP Xin chào!</h2>
                <div className="flex flex-col gap-2">
                  {["Học phí ngành Y khoa 2025?", "Các phương thức tuyển sinh?", "Nộp chứng chỉ IELTS?"].map((sugg, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInput(sugg)
                        setIsFirstLoad(false)
                        setTimeout(() => handleSubmit(), 100)
                      }}
                      className="px-5 py-2 rounded-full bg-white border border-blue-400 text-blue-600 hover:bg-blue-600 hover:text-white transition"
                    >
                      {sugg}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                const isAI = msg.role === 'assistant';
                return (
                  <div key={idx} className={`flex items-start gap-2 p-3 rounded-md ${isUser ? "bg-blue-50" : "bg-gray-100"} text-gray-800`}>
                    {isAI && (
                      <img
                        src="/logo/logo.png" // 🖼️ Đường dẫn avatar, bạn đổi file nếu cần
                        alt="AI Avatar"
                        className="w-8 h-8 rounded-full object-cover mt-1"
                      />
                    )}
                    
                    {/* Nội dung tin nhắn */}
                  {/* <div className="flex-1"> */}
                  <div className="flex-1 whitespace-pre-wrap">
                    {isUser && <strong>User: </strong>}
                    {msg.content}
                  </div>
                  </div>
                );
              })
              
            )}
            {/* {isTyping && <div className="text-sm text-gray-500">🤖 Đang soạn câu trả lời{typingDots}</div>} */}
            {isTyping && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <img
                  src="/logo/logo.png"  // 🔥 Thay đường dẫn avatar bạn muốn
                  alt="AI Avatar"
                  className="w-6 h-6 rounded-full object-cover"
                />
                <span>Đang soạn câu trả lời{typingDots}</span>
              </div>
            )}

            {/* 💡 Gợi ý câu hỏi sau trả lời */}
            {suggestions.length > 0 && (
              <div className="mt-4 px-4 py-2 bg-gray-50 rounded-lg border text-sm">
                {/* <div className="font-medium mb-1">💡 Câu hỏi gợi ý:</div> */}
                <div className="font-medium mb-1 text-gray-800">💡 Câu hỏi gợi ý:</div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((sugg, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInput(sugg)
                      }}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 text-xs"
                    >
                      {sugg}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input + nút gửi */}
              {/* Ô nhập câu hỏi */}

            {/* <div className="border-t p-4 flex items-end bg-white relative"> */}
            {/* <div className="border-t p-3 sticky bottom-0 bg-white"> */}
            <div className="relative sticky bottom-0 flex items-center p-2 gap-2 bg-white border-t">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onInput={e => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="Hỏi UMP AI chat..."
                className="flex-1 w-[calc(100%-4rem)] border border-gray-300 rounded-3xl shadow-sm px-4 py-4 text-base text-blue-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white resize-none overflow-hidden leading-tight break-words pr-16 max-h-40"
                rows={1}
              />

              {/* Nút Microphone */}
              <button 
                onClick={isRecording ? stopRecording : startRecording}
              //   className="absolute bottom-1 right-15 p-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
              // >
              className="absolute right-20 bottom-3 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                <MicrophoneIcon className={`w-7 h-7 ${isRecording ? 'text-red-500 animate-ping' : ''}`} />
              </button>

              {/* Nút Gửi */}
              <button
                onClick={handleSubmit}
                className="ml-2 mb-1 p-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
                style={{
                  right: '1rem',   // 👉 Sát mép phải
                  top: '50%',
                  transform: 'translateY(6px) translateY(-4px)', // 👉 Tuỳ chỉnh lên/xuống
                }}
              >
                <PaperAirplaneIcon className="w-6 h-6 rotate-270" />
              </button>

            </div>
            <div className="mt-1 text-center text-xs text-gray-500 px-4">
            UMP AI chat có thể mắc sai sót, hãy liên hệ Nhà trường nếu cần xác minh câu trả lời.
          </div>
        </section>
      </main>

      {/* Sidebar phải */}
      <aside className="bg-gray-50 flex-shrink-0 w-full md:w-1/5 overflow-y-auto hidden md:block p-3 text-sm text-gray-600">
      <h3 className="font-semibold mb-2">🔹 Lưu ý</h3>
      <ul className="list-disc pl-5 space-y-1">
        <li>📌 Đây là hệ thống tư vấn AI 24/7 của Đại học Y Dược TPHCM</li>
        <li>📌 Dữ liệu được cung cấp từ Phòng Đào tạo đại học và Phòng Công tác sinh viên ĐHYD TPHCM</li>
        <li>📌 Một số câu hỏi hệ thống sẽ tìm kiếm trên internet nếu thiếu dữ liệu, người dùng nên kiểm tra nguồn chính thống.</li>
      </ul>
      <hr className="my-4" />
      <p className="text-xs text-gray-400">Phiên bản AI tư vấn ĐHYD TPHCM.</p>
    </aside>

    </div>
  )
}