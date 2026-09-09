import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/officer/dashboard")({
  component: OfficerDashboard,
});

function OfficerDashboard() {
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

  if (!user) return <div className="p-6">Đang tải dữ liệu...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Bảng quản trị Cảnh sát giao thông</h1>
      <p className="mt-2 text-gray-600">
        Cán bộ: <span className="font-semibold">{user.fullName}</span> ({user.badgeNumber})
      </p>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-blue-50 p-4">
          <h3 className="text-sm font-medium text-blue-800">Đơn vị công tác</h3>
          <p className="mt-1 text-lg font-bold text-blue-900">{user.unit}</p>
        </div>
      </div>
    </div>
  );
}