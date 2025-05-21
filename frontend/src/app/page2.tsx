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