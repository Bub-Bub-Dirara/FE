
import { useCallback, useMemo, useState } from "react";
import axios from "axios";
import useForm from "../hooks/useForm";
import LoginForm from "./loginForm";
import { validateSignin, type UserSignInformation } from "../utils/validate";
import { http } from "../lib/http";
import { useAuth } from "../stores/useAuth";

type Props = { open: boolean; onClose: () => void; anchor?: "bottom-left" | "bottom-right" };

type FastAPIValidationDetail = { loc: (string | number)[]; msg: string; type: string };
type FastAPIError = { detail?: string | FastAPIValidationDetail[] };

function extractErrorMessage(e: unknown): string {
  const fallback = "요청에 실패했습니다.";
  if (axios.isAxiosError<FastAPIError>(e)) {
    const d = e.response?.data?.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d) && d.length > 0 && typeof d[0]?.msg === "string") return d[0].msg;
    return e.message || fallback;
  }
  if (e instanceof Error) return e.message || fallback;
  return fallback;
}

export default function AuthBubble({ open, onClose }: Props) {
  const { isAuthed, user, login, logout, deleteAccount } = useAuth();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [pending, setPending] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  const loginForm = useForm<UserSignInformation>({
    initialValue: { email: "", password: "" },
    validate: validateSignin,
  });

  const signupValidate = useCallback((v: UserSignInformation) => validateSignin(v), []);
  const signupForm = useForm<UserSignInformation>({
    initialValue: { email: "", password: "" },
    validate: signupValidate,
  });

  const [showConfirm, setShowConfirm] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);
  const confirmError = useMemo(() => {
    const pw = signupForm.values.password;
    if (!confirmTouched) return "";
    if (!pw || !confirm) return "";
    return pw !== confirm ? "비밀번호가 일치하지 않습니다." : "";
  }, [confirmTouched, confirm, signupForm.values.password]);

  if (!open) return null;
  const pos = "left-20 bottom-3" ;

  const handleLogin = async () => {
    if (
      Object.values(loginForm.errors).some(Boolean) ||
      !loginForm.values.email ||
      !loginForm.values.password
    ) return;

    setErrMsg(""); setInfoMsg(""); setPending(true);
    try {
      await login(loginForm.values.email, loginForm.values.password);
      loginForm.reset();
      setMode("login");
    } catch (e) {
      setErrMsg(extractErrorMessage(e));
    } finally {
      setPending(false);
    }
  };

  const handleSignup = async () => {
    if (
      Object.values(signupForm.errors).some(Boolean) ||
      !signupForm.values.email ||
      !signupForm.values.password ||
      !confirm ||
      !!confirmError
    ) return;

    setErrMsg(""); setInfoMsg(""); setPending(true);
    try {
      await http.post<{ id: number; email: string }>("/auth/signup", {
        email: signupForm.values.email,
        password: signupForm.values.password,
      });
      signupForm.reset();
      setConfirm(""); setConfirmTouched(false);
      setMode("login");
      setInfoMsg("회원가입이 완료되었습니다. 로그인해 주세요.");
    } catch (e) {
      setErrMsg(extractErrorMessage(e));
    } finally {
      setPending(false);
    }
  };

  const handleDelete = async () => {
    setErrMsg(""); setPending(true);
    try { await deleteAccount(); onClose(); } 
    catch (e) { setErrMsg(extractErrorMessage(e)); } 
    finally { setPending(false); }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0" onClick={onClose} />
      <div className={`absolute ${pos} w-[340px] rounded-2xl bg-white shadow-2xl border border-gray-200`}>
        <div className="absolute left-[-10px] bottom-8 w-0 h-0 
                        border-t-[10px] border-b-[10px] border-r-[12px] 
                        border-t-transparent border-b-transparent border-r-white" />
        <div className="p-6">
          {isAuthed ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">👤</div>
                <div className="font-semibold text-gray-800">
                  {user?.name ?? user?.email.split("@")[0] ?? "User"}
                </div>
              </div>
              {errMsg && <p className="text-sm text-red-600">{errMsg}</p>}
              <button onClick={logout} disabled={pending}
                className="w-full h-11 rounded-md border border-[#204B66] text-[#204B66] font-semibold disabled:opacity-50">
                로그아웃
              </button>
              <button onClick={handleDelete} disabled={pending}
                className="w-full h-11 rounded-md bg-[#204B66] text-white font-semibold disabled:opacity-50">
                회원탈퇴
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-center mb-5">
                {mode === "login" ? "[ Login ]" : "[ Sign ]"}
              </h2>
              {infoMsg && <p className="mb-3 text-sm text-green-700">{infoMsg}</p>}
              {errMsg && <p className="mb-3 text-sm text-red-600">{errMsg}</p>}

              {mode === "login" ? (
                <>
                  <div className="space-y-3">
                    <LoginForm name="email" context="Email" {...loginForm} />
                    <LoginForm name="password" context="Password" {...loginForm} />
                  </div>
                  <button onClick={handleLogin}
                    disabled={pending || Object.values(loginForm.errors).some(Boolean) ||
                      !loginForm.values.email || !loginForm.values.password}
                    className="w-full h-11 mt-4 rounded-md bg-[#204B66] text-white font-semibold disabled:opacity-40">
                    LOG IN
                  </button>
                  <p className="text-sm text-center mt-4">
                    아직 계정이 없나요?{" "}
                    <button className="underline" onClick={() => setMode("signup")}>회원가입</button>
                  </p>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <LoginForm name="email" context="이메일을 입력하세요." {...signupForm} />
                    <LoginForm name="password" context="비밀번호를 입력하세요." {...signupForm} />
                    <div className="relative w-70">
                      <input
                        type={showConfirm ? "text" : "password"}
                        placeholder="비밀번호를 한 번 더 입력하세요."
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        onBlur={() => setConfirmTouched(true)}
                        className={`w-full h-10 rounded text-gray-700 border px-3 mb-1 text-sm pr-9 ${
                          confirmError ? "border-red-500 bg-red-50" : "border-gray-300"
                        }`}
                      />
                      <button type="button" onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">
                        {showConfirm ? "x" : "o"}
                      </button>
                    </div>
                    {confirmError && <p className="text-red-500 text-sm mb-2 ml-1">비밀번호가 일치하지 않습니다.</p>}
                  </div>
                  <button onClick={handleSignup}
                    disabled={pending || Object.values(signupForm.errors).some(Boolean) ||
                      !signupForm.values.email || !signupForm.values.password || !confirm || !!confirmError}
                    className="w-full h-11 mt-4 rounded-md bg-gray-200 border border-gray-300 text-gray-800 font-semibold disabled:opacity-40">
                    Sign up
                  </button>
                  <p className="text-sm text-center mt-4">
                    이미 계정이 존재하나요?{" "}
                    <button className="underline" onClick={() => setMode("login")}>로그인</button>
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
