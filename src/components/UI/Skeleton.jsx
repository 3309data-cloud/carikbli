// components/UI/Skeleton.jsx

export const ChatSkeleton = () => (
  <div className="flex justify-start animate-pulse">
    <div className="bg-gray-200 border border-gray-100 rounded-2xl rounded-tl-none px-4 py-3 w-2/3 shadow-sm">
      <div className="h-3 bg-gray-300 rounded w-full mb-2"></div>
      <div className="h-3 bg-gray-300 rounded w-5/6"></div>
      {/* Placeholder untuk tombol opsi jika ada */}
      <div className="mt-4 space-y-2">
        <div className="h-10 bg-gray-100 rounded-xl w-full"></div>
        <div className="h-10 bg-gray-100 rounded-xl w-full"></div>
      </div>
    </div>
  </div>
);

export const ResultSkeleton = () => (
  <div className="space-y-4 animate-pulse pb-10">
    <div className="rounded-3xl overflow-hidden shadow-md border-t-8 border-gray-200 bg-white">
      <div className="p-5 space-y-4">
        {/* Hierarchy Placeholder */}
        <div className="flex gap-2">
          <div className="h-5 w-8 bg-gray-200 rounded"></div>
          <div className="h-5 w-40 bg-gray-200 rounded"></div>
        </div>
        {/* Kode & Judul Placeholder */}
        <div className="space-y-2">
          <div className="h-10 w-32 bg-gray-300 rounded-xl"></div>
          <div className="h-6 w-3/4 bg-gray-300 rounded"></div>
        </div>
        {/* Uraian Placeholder */}
        <div className="p-4 bg-gray-50 rounded-2xl space-y-2">
          <div className="h-3 bg-gray-200 rounded w-full"></div>
          <div className="h-3 bg-gray-200 rounded w-full"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </div>
        {/* Button Placeholder */}
        <div className="h-14 bg-gray-200 rounded-2xl w-full mt-4"></div>
      </div>
    </div>
  </div>
);