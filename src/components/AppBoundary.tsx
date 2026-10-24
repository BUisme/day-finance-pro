import { Component, type ReactNode } from "react";
export class AppBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="fatal">
        <h1>DAY Finance Pro</h1>
        <h2>ไม่สามารถเปิดแอปได้</h2>
        <p role="alert">
          กรุณาโหลดหน้าใหม่ หากยังพบปัญหาให้ติดต่อผู้ดูแล
          โดยข้อมูลในอุปกรณ์ยังไม่ถูกลบ
        </p>
        <button className="primary" onClick={() => location.reload()}>
          โหลดหน้าใหม่
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
