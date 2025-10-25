import { useState, useCallback } from "react";
import useForm from "../hooks/useForm";
import { validateSignin, type UserSignInformation } from "../utils/validate";
import LoginForm from "./loginForm";

type Props = {
  open: boolean;
  onClose: () => void;
  anchor?: "bottom-left" | "bottom-right";
};

type ValidateFn = (values: UserSignInformation) => Record<keyof UserSignInformation, string>;

export default function AuthBubble({ open, onClose, anchor = "bottom-left" }: Props) {

  const [mode, setMode] = useState<"login" | "signup">("login");

  const loginForm = useForm<UserSignInformation>({
    initialValue: { email: "", password: "" },
    validate: validateSignin,
  });

  const signupValidate: ValidateFn = useCallback((values) => validateSignin(values), []);
  const signupForm = useForm<UserSignInformation>({
    initialValue: { email: "", password: "" },
    validate: signupValidate,
  });

  const [showConfirm, setShowConfirm] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);
  const confirmError =
    confirmTouched &&
    signupForm.values.password !== "" &&
    confirm !== "" &&
    signupForm.values.password !== confirm
      ? "비밀번호가 일치하지 않습니다."
      : "";

  if (!open) return null;

  const pos = anchor === "bottom-left" ? "left-16 bottom-20" : "right-16 bottom-20";

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0" onClick={onClose} />
      <div className={`absolute ${pos} w-[340px] rounded-2xl bg-white shadow-2xl border border-gray-200`}>
        <div className={`absolute -bottom-3 ${anchor === "bottom-left" ? "left-4" : "right-4"} 
                        w-0 h-0 border-l-[10px] border-r-[10px] border-t-[12px] 
                        border-l-transparent border-r-transparent border-t-white drop-shadow`} />
        <div className="p-6">
          <h2 className="text-xl font-semibold text-center mb-5">
            {mode === "login" ? "[ Login ]" : "[ Sign ]"}
          </h2>

          {mode === "login" ? (
            <>
              <div className="space-y-3">
                <LoginForm name="email" context="Email" {...loginForm} />
                <LoginForm name="password" context="Password" {...loginForm} />
              </div>

              <button
                disabled={
                  Object.values(loginForm.errors).some(Boolean) ||
                  Object.values(loginForm.values).some((v) => v === "")
                }
                className="w-full h-11 mt-4 rounded-md bg-[#204B66] text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                LOG IN
              </button>

              <p className="text-sm text-center mt-4">
                아직 계정이 없나요?{" "}
                <button className="underline" onClick={() => setMode("signup")}>
                  회원가입
                </button>
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
                                className={`w-full h-10 rounded text-gray-400 border items-center justify-start px-3 mb-3 text-sm pr-9 ${ confirmError ? "border-red-500 bg-red-200" : "border-gray-300"}`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm((v) => !v)}
                                aria-label={showConfirm ? "비밀번호 숨기기" : "비밀번호 보기"}
                                className="absolute right-2 top-1/3 -translate-y-1/2 text-gray-500 leading-none"
                            >
                                {showConfirm ? "x" : "o"}
                            </button>
                        </div>
                        { confirmError && (
                            <p className="relative w-70 text-red-500 text-sm mb-2 ml-3">비밀번호가 일치하지 않습니다.</p>
                        )}
              </div>

              <button
                disabled={
                  Object.values(signupForm.errors).some(Boolean) ||
                  signupForm.values.email === "" ||
                  signupForm.values.password === "" ||
                  confirm === "" ||
                  !!confirmError
                }
                className="w-full h-11 mt-4 rounded-md bg-gray-200 border border-gray-300 text-gray-800 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Sign up
              </button>

              <p className="text-sm text-center mt-4">
                이미 계정이 존재하나요?{" "}
                <button className="underline" onClick={() => setMode("login")}>
                  로그인
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
