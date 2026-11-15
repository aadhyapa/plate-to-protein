import { useState } from 'react';
import { useAppState } from '../../state/AppState';

interface Question {
  prompt: string;
  options: string[];
  correct: number;
  explanation: string;
}

const QUESTIONS: Question[] = [
  {
    prompt: 'Where does the chemical digestion of protein begin?',
    options: ['The mouth', 'The stomach', 'The small intestine', 'The bloodstream'],
    correct: 1,
    explanation: 'Stomach acid unfolds proteins and pepsin makes the first cuts. Chewing only breaks food into smaller pieces.',
  },
  {
    prompt: 'What is a "limiting amino acid"?',
    options: [
      'An amino acid the body cannot absorb',
      'The amino acid with the fewest calories',
      'The essential amino acid a food or meal is shortest on, compared with what the body needs',
      'An amino acid that is harmful in large amounts',
    ],
    correct: 2,
    explanation: 'It is the essential amino acid furthest below the reference pattern, so it is the first one to run short.',
  },
  {
    prompt: 'Rice is low in lysine. Which food complements it best?',
    options: ['White bread', 'Pasta', 'Corn tortillas', 'Black beans'],
    correct: 3,
    explanation: 'Beans and other legumes are rich in lysine. Bread, pasta and tortillas are grain foods and are low in lysine too.',
  },
];

export const GUT_QUIZ_ID = 'gut';
export const GUT_QUIZ_LENGTH = QUESTIONS.length;

/** Three questions with immediate feedback. The best score is saved. */
export default function Quiz() {
  const { state, setQuizScore, completeStage } = useAppState();
  const [answers, setAnswers] = useState<(number | null)[]>(() => QUESTIONS.map(() => null));
  const answered = answers.filter((answer) => answer !== null).length;
  const score = answers.filter((answer, index) => answer === QUESTIONS[index].correct).length;
  const finished = answered === QUESTIONS.length;
  const best = state.quizScores[GUT_QUIZ_ID];

  const choose = (questionIndex: number, optionIndex: number) => {
    if (answers[questionIndex] !== null) return;
    const next = answers.map((answer, index) => (index === questionIndex ? optionIndex : answer));
    setAnswers(next);
    if (next.every((answer) => answer !== null)) {
      setQuizScore(GUT_QUIZ_ID, next.filter((answer, index) => answer === QUESTIONS[index].correct).length);
      completeStage('gut');
    }
  };

  return (
    <section className="quiz" aria-labelledby="quiz-heading">
      <h2 id="quiz-heading" className="section-title">
        Quick quiz
      </h2>
      <ol className="quiz__list">
        {QUESTIONS.map((question, questionIndex) => {
          const chosen = answers[questionIndex];
          return (
            <li key={question.prompt} className="card quiz__question">
              <fieldset disabled={chosen !== null}>
                <legend>
                  {questionIndex + 1}. {question.prompt}
                </legend>
                <div className="quiz__options">
                  {question.options.map((option, optionIndex) => {
                    const isChosen = chosen === optionIndex;
                    const isCorrect = optionIndex === question.correct;
                    const mark = chosen === null ? '' : isCorrect ? ' is-correct' : isChosen ? ' is-wrong' : '';
                    return (
                      <button
                        key={option}
                        type="button"
                        className={`quiz__option${mark}`}
                        aria-pressed={isChosen}
                        onClick={() => choose(questionIndex, optionIndex)}
                      >
                        {option}
                        {chosen !== null && isCorrect && <span className="quiz__mark"> ✓ Correct answer</span>}
                        {isChosen && !isCorrect && <span className="quiz__mark"> ✗ Your answer</span>}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <p className="quiz__feedback" role="status">
                {chosen !== null && (
                  <>
                    <strong>{chosen === question.correct ? 'Right.' : 'Not quite.'}</strong> {question.explanation}
                  </>
                )}
              </p>
            </li>
          );
        })}
      </ol>
      <div className="quiz__result" role="status">
        {finished ? (
          <p>
            <strong>
              You got {score} of {QUESTIONS.length}.
            </strong>{' '}
            <button type="button" className="link-button" onClick={() => setAnswers(QUESTIONS.map(() => null))}>
              Try again
            </button>
          </p>
        ) : (
          best !== undefined && (
            <p className="muted small">
              Your best score so far: {best} of {QUESTIONS.length}
            </p>
          )
        )}
      </div>
    </section>
  );
}
