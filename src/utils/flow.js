export function findNextQuestion(
  flows,
  questionId,
  answer
) {

  return flows.find(f =>

    f.question_id === questionId &&
    f.answer === answer

  );
}