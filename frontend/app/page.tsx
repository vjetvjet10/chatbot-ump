
// 'use client'

// import { useState } from "react"
// import dynamic from "next/dynamic"
// import ChatUI from "../components/ChatUI"

// // ✅ Import PdfPreview (client only)
// const PdfPreview = dynamic(() => import("../components/PdfPreview"), { ssr: false })

// export default function Home() {
//   const [sources, setSources] = useState<string[]>([])

//   const handleNewSource = (filename: string) => {
//     setSources((prev) => (prev.includes(filename) ? prev : [...prev, filename]))
//   }

//   return (
//     <div className="flex flex-col md:flex-row min-h-screen w-screen bg-white">

//       {/* Cột trái - Nguồn tài liệu */}
//       <aside className="hidden lg:block lg:w-1/4 bg-gray-100 border-r p-4 overflow-y-auto">
//         <h2 className="text-xl font-bold mb-4">📄 Nguồn tài liệu</h2>
//         {sources.length === 0 ? (
//           <p className="text-sm text-gray-500">Chưa có tài liệu được trích dẫn.</p>
//         ) : (
//           <ul className="space-y-6 text-sm text-gray-800 mt-2">
//             {sources.map((file, idx) => (
//               <li key={idx} className="bg-white p-3 rounded shadow space-y-2 max-w-full overflow-x-auto">
//                 <p className="font-medium text-blue-700 break-words">{file}</p>
//                 <PdfPreview fileUrl={`/files/${file}`} />
//                 <div className="text-xs text-blue-600 underline">
//                   <a
//                     href={`/files/${file}`}
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     download
//                   >
//                     📥 Tải xuống
//                   </a>
//                 </div>
//               </li>
//             ))}
//           </ul>
//         )}
//       </aside>

//       {/* Cột giữa - ChatUI */}
//       <main className="flex-1 flex flex-col overflow-hidden bg-white">
//         {/* 🔹 Thanh chào mừng */}
//         <div className="sticky top-0 z-10 bg-blue-600 text-white text-sm md:text-base p-3 shadow font-semibold text-center">
//         Chào mừng bạn đến với hệ thống AI tư vấn thông minh của Đại học Y Dược TPHCM
//         </div>

//         <ChatUI onNewSource={handleNewSource} />
//       </main>

//       {/* Cột phải - Gợi ý */}
//       <aside className="hidden md:block md:w-1/4 lg:w-1/4 bg-gray-50 border-l p-4 overflow-y-auto">
//         <h2 className="text-xl font-bold mb-4">💡 Gợi ý</h2>
//         <ul className="space-y-3 text-sm text-gray-700">
//           <li>“Trường có ngành Dược không?”</li>
//           <li>“Điều kiện tuyển thẳng là gì?”</li>
//           <li>“Có ký túc xá không?”</li>
//         </ul>
//       </aside>
//     </div>
//   )
// }
// 'use client'

// import { useState } from "react"
// import dynamic from "next/dynamic"
// import ChatUI from "../components/ChatUI"

// const PdfPreview = dynamic(() => import("../components/PdfPreview"), { ssr: false })

// export default function Home() {
//   const [sources, setSources] = useState<string[]>([])

//   const handleNewSource = (filename: string) => {
//     setSources(prev => (prev.includes(filename) ? prev : [...prev, filename]))
//   }

//   return (
//     <div className="flex flex-col md:flex-row min-h-screen bg-white">

//       {/* Cột trái - Tài liệu */}
//       <aside className="hidden lg:block lg:w-1/4 bg-gray-100 border-r p-4 overflow-y-auto">
//         <h2 className="text-xl font-bold mb-4">📄 Nguồn tài liệu</h2>
//         {sources.length === 0 ? (
//           <p className="text-sm text-gray-500">Chưa có tài liệu được trích dẫn.</p>
//         ) : (
//           <ul className="space-y-6 text-sm text-gray-800 mt-2">
//             {sources.map((file, idx) => (
//               <li key={idx} className="bg-white p-3 rounded shadow space-y-2 max-w-full overflow-x-auto">
//                 <p className="font-medium text-blue-700 break-words">{file}</p>
//                 <PdfPreview fileUrl={`/files/${file}`} />
//                 <div className="text-xs text-blue-600 underline">
//                   <a
//                     href={`/files/${file}`}
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     download
//                   >
//                     📥 Tải xuống
//                   </a>
//                 </div>
//               </li>
//             ))}
//           </ul>
//         )}
//       </aside>

//       {/* Cột giữa - Chat */}
//       <main className="flex-1 flex flex-col h-screen bg-white">
//         <div className="bg-blue-600 text-white text-sm md:text-base p-3 shadow font-semibold text-center z-10">
//           👋 Chào mừng bạn đến với hệ thống AI tư vấn thông minh của Đại học Y Dược TPHCM
//         </div>

//         <ChatUI onNewSource={handleNewSource} />
//       </main>

//       {/* Cột phải - Gợi ý */}
//       <aside className="hidden md:block md:w-1/4 bg-gray-50 border-l p-4 overflow-y-auto">
//         <h2 className="text-xl font-bold mb-4">💡 Gợi ý</h2>
//         <ul className="space-y-3 text-sm text-gray-700">
//           <li>“Trường có ngành Dược không?”</li>
//           <li>“Điều kiện tuyển thẳng là gì?”</li>
//           <li>“Có ký túc xá không?”</li>
//         </ul>
//       </aside>
//     </div>
//   )
// }
'use client'

import { useState } from "react"
import dynamic from "next/dynamic"
import ChatUI from "../components/ChatUI"

const PdfPreview = dynamic(() => import("../components/PdfPreview"), { ssr: false })

export default function Home() {
  const [sources, setSources] = useState<string[]>([])

  // Đồng bộ với cột giữa: chỉ hiển thị danh sách tài liệu duy nhất
  const handleNewSources = (docs: string[]) => {
    setSources(prev => {
      const unique = [...new Set([...prev, ...docs])]
      return unique
    })
  }

  return (
    <div className="flex bg-white min-h-screen">

      {/* ✅ Cột trái - Tài liệu */}
      <aside className="fixed top-0 left-0 h-screen w-1/4 bg-gray-100 border-r p-4 overflow-y-auto z-20 hidden md:block">
        <h2 className="text-xl font-bold mb-4">📄 Nguồn tài liệu</h2>
        {sources.length === 0 ? (
          <p className="text-sm text-gray-500">Chưa có tài liệu được trích dẫn.</p>
        ) : (
          <ul className="space-y-6 text-sm text-gray-800 mt-2">
            {sources.map((source, idx) => (
              <li key={idx} className="bg-white p-3 rounded shadow space-y-2 max-w-full overflow-x-auto">
                <p className="font-medium text-blue-700 break-words">{source}</p>
                <PdfPreview fileUrl={`/files/${source}`} />
                <div className="text-xs text-blue-600 underline">
                  <a
                    href={`/files/${source}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                  >
                    📥 Tải xuống
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* ✅ Cột giữa + phải */}
      <div className="ml-0 md:ml-[25%] w-full md:w-[75%] flex flex-col md:flex-row h-screen">

        {/* 🔹 Cột giữa - Chat */}
        <main className="w-full md:w-3/4 flex flex-col h-full bg-white">
          <div className="bg-blue-600 text-white text-sm md:text-base p-3 shadow font-semibold text-center z-10">
            👋 Chào mừng bạn đến với hệ thống AI tư vấn thông minh của Đại học Y Dược TPHCM
          </div>
          <ChatUI onNewSources={handleNewSources} />
        </main>

        {/* 🔹 Cột phải - Gợi ý câu hỏi */}
        <aside className="hidden md:block w-full md:w-1/4 bg-gray-50 border-l p-4 overflow-y-auto">
          <h2 className="text-xl font-bold mb-4">💡 Gợi ý</h2>
          <ul className="space-y-3 text-sm text-gray-700">
            <li>Trường có ngành Dược không?</li>
            <li>Điều kiện tuyển thẳng là gì?</li>
            <li>Có ký túc xá không?</li>
          </ul>
        </aside>
      </div>
    </div>
  )
}
