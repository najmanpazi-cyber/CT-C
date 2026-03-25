import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cv-surface px-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl font-extrabold font-headline text-cv-primary mb-4">404</div>
        <h1 className="text-lg font-bold text-cv-on-surface mb-2">Page not found</h1>
        <p className="text-sm text-cv-on-surface-variant mb-6">The page you're looking for doesn't exist or has been moved.</p>
        <Link
          to="/"
          className="inline-block bg-medical-gradient text-cv-on-primary px-6 py-3 text-sm font-bold rounded-lg shadow-sm hover:shadow-md hover:brightness-110 transition-all"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
