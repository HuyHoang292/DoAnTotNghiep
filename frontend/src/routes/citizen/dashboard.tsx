import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/citizen/dashboard")({
  component: CitizenDashboard,
});

function CitizenDashboard() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    fetch("http://localhost:5000/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setUser(data.user))
      .catch(() => (window.location.href = "/login"));
  }, []);

  if (!user) return <div className="p-6">Đang tải thông tin...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Trang chủ Công dân</h1>
      <p className="mt-2 text-gray-600">Xin chào, {user.fullName}!</p>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-gray-700">Số CCCD</h2>
          <p className="mt-1 text-lg font-bold">{user.nationalId}</p>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-gray-700">Email</h2>
          <p className="mt-1 text-lg font-bold">{user.email}</p>
        </div>
      </div>
    </div>
  );
}