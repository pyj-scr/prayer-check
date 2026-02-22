import { redirect } from "next/navigation";

export default function Home() {
  // 원하는 기본 방을 지정 (예: room1)
  redirect("/r/room1");
}