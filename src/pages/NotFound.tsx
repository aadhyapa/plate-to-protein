import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <article className="stage">
      <p className="eyebrow">Page not found</p>
      <h1 className="stage__title">That page isn't part of the journey.</h1>
      <p className="stage__blurb">The link may be old or mistyped.</p>
      <div className="stage__nav">
        <Link className="button button--primary" to="/">
          Back to the start
        </Link>
      </div>
    </article>
  );
}
