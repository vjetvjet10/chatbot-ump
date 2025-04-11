// 'use client'

// import { useState } from 'react'
// import { Document, Page, pdfjs } from 'react-pdf'
// import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
// import 'react-pdf/dist/esm/Page/TextLayer.css'


// // Cấu hình worker PDF.js
// pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

// interface PdfPreviewProps {
//   fileUrl: string
// }

// export default function PdfPreview({ fileUrl }: PdfPreviewProps) {
//   const [numPages, setNumPages] = useState<number>(0)
//   const [scale, setScale] = useState<number>(1.2)

//   return (
//     <div className="mt-4 border rounded shadow p-3 bg-white" style={{ maxWidth: '450px', overflowX: 'auto' }}>
//       <div className="flex justify-between items-center mb-2">
//         <p className="text-sm text-gray-700 font-semibold">📄 Xem trước PDF:</p>
//         <div className="space-x-2">
//           <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="text-sm bg-gray-200 px-2 py-1 rounded hover:bg-gray-300">–</button>
//           <button onClick={() => setScale(s => Math.min(2.5, s + 0.2))} className="text-sm bg-gray-200 px-2 py-1 rounded hover:bg-gray-300">+</button>
//         </div>
//       </div>

//       <Document
//         file={fileUrl}
//         onLoadSuccess={({ numPages }) => setNumPages(numPages)}
//         loading={<p className="text-sm text-gray-500">Đang tải tài liệu...</p>}
//       >
//         {Array.from(new Array(numPages), (_, i) => (
//           <Page
//             key={`page_${i + 1}`}
//             pageNumber={i + 1}
//             scale={scale}
//             className="mb-4 border rounded"
//           />
//         ))}
//       </Document>
//     </div>
//   )
// }
// 
'use client'

import { useEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'

// Cấu hình worker PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

interface PdfPreviewProps {
  fileUrl: string
}

export default function PdfPreview({ fileUrl }: PdfPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [numPages, setNumPages] = useState(0)
  const [scale, setScale] = useState(1.2)

  // Tự scale theo kích thước container
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth
        // Scale nhỏ hơn với cột hẹp, lớn hơn khi rộng
        const newScale = Math.min(Math.max(width / 500, 0.8), 1.8)
        setScale(newScale)
      }
    }

    updateScale()
    window.addEventListener("resize", updateScale)
    return () => window.removeEventListener("resize", updateScale)
  }, [])

  return (
    <div
      ref={containerRef}
      className="border rounded shadow p-3 bg-white"
      style={{ maxWidth: '100%', overflowX: 'auto' }}
    >
      <Document
        file={fileUrl}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        loading={<p className="text-sm text-gray-500">Đang tải tài liệu...</p>}
      >
        {Array.from({ length: numPages }, (_, i) => (
          <Page
            key={`page_${i + 1}`}
            pageNumber={i + 1}
            scale={scale}
            className="mb-4 border rounded"
          />
        ))}
      </Document>
    </div>
  )
}

// 'use client'

// import { useState } from 'react'
// import { Document, Page, pdfjs } from 'react-pdf'
// import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
// import 'react-pdf/dist/esm/Page/TextLayer.css'

// pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

// interface PdfPreviewProps {
//   fileUrl: string
//   snippet?: string
// }

// export default function PdfPreview({ fileUrl, snippet }: PdfPreviewProps) {
//   const [numPages, setNumPages] = useState<number>(0)
//   const [scale, setScale] = useState<number>(1.2)
//   const [expanded, setExpanded] = useState<boolean>(false)

//   return (
//     <div className="mt-4 border rounded shadow p-3 bg-white" style={{ maxWidth: '450px', overflowX: 'auto' }}>
//       <div className="flex justify-between items-center mb-2">
//         <p className="text-sm text-gray-700 font-semibold">📄 Xem trước PDF:</p>
//         <div className="space-x-2">
//           <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="text-sm bg-gray-200 px-2 py-1 rounded hover:bg-gray-300">–</button>
//           <button onClick={() => setScale(s => Math.min(2.5, s + 0.2))} className="text-sm bg-gray-200 px-2 py-1 rounded hover:bg-gray-300">+</button>
//         </div>
//       </div>

//       {/* Nếu chưa mở rộng, chỉ hiển thị snippet */}
//       {!expanded && snippet && (
//         <div className="text-sm text-gray-600 italic mb-2">
//           "{snippet.slice(0, 300)}..."
//         </div>
//       )}

//       {expanded && (
//         <Document
//           file={fileUrl}
//           onLoadSuccess={({ numPages }) => setNumPages(numPages)}
//           loading={<p className="text-sm text-gray-500">Đang tải tài liệu...</p>}
//         >
//           {Array.from(new Array(numPages), (_, i) => (
//             <Page
//               key={`page_${i + 1}`}
//               pageNumber={i + 1}
//               scale={scale}
//               className="mb-4 border rounded"
//             />
//           ))}
//         </Document>
//       )}

//       <button
//         onClick={() => setExpanded(!expanded)}
//         className="mt-2 text-xs text-blue-600 underline"
//       >
//         {expanded ? 'Ẩn tài liệu' : '📖 Xem toàn bộ tài liệu'}
//       </button>
//     </div>
//   )
// }
