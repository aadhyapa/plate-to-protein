import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p className="site-footer__disclaimer">
          <strong>Educational, not medical advice.</strong> Plate to Cell explains how protein works. It
          can't tell you what you personally should eat. For that, talk to a doctor or registered
          dietitian.
        </p>
        <ul className="site-footer__links">
          <li>
            <Link to="/about">Sources and credits</Link>
          </li>
          <li>
            <a href="https://github.com/aadhyapa/plate-to-protein" target="_blank" rel="noreferrer">
              GitHub repo
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
