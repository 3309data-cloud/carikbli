export default function ChatBubble({ msg, data, answers, onAnswer }) {
  const isUser = msg.type === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[90%] px-4 py-3 rounded-2xl text-sm transition-all ${
        isUser
          ? "bg-orange-500 text-white rounded-tr-none shadow-md shadow-orange-100"
          : "bg-white border border-gray-200 text-gray-700 rounded-tl-none shadow-sm"
      }`}>
        {msg.text}
        
        {msg.type === "bot" && msg.question && (
          <div className="grid grid-cols-1 gap-2 mt-4">
            {data.options
              .filter(opt => String(opt.question_id) === String(msg.question.id))
              .map(opt => {
                const isAnswered = answers[msg.question.dimension] !== undefined;
                const isSelected = answers[msg.question.dimension] === opt.value;

                return (
                  <button
                    key={opt.id}
                    onClick={() => onAnswer(msg.question, opt.value)}
                    disabled={isAnswered}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex justify-between items-center ${
                      !isAnswered
                        ? "bg-gray-50 border border-gray-200 hover:bg-orange-500 hover:text-white active:scale-95 cursor-pointer"
                        : isSelected
                          ? "bg-orange-500 text-white border-transparent shadow-sm"
                          : "bg-gray-50 text-gray-400 border border-gray-100 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}