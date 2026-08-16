// Shown in place of a blank screen while auth/route/data guards are resolving.
export default function LoadingScreen() {
  return (
    <div className="app-loading">
      <div className="app-loading-spinner">
        <i className="fa-solid fa-graduation-cap"></i>
      </div>
    </div>
  );
}
