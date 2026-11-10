import Image from "next/image";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-band bg-deep-indigo p-6 md:p-8">
        <p className="flex items-center gap-3 font-title text-[24px] leading-none">
          <span className="flex size-12 items-center justify-center rounded-full border border-warm-ivory">
            <Image src="/brand/logo-pastille.svg" alt="" width={28} height={28} unoptimized className="size-7" />
          </span>
          LA TEUF <span className="text-solar-copper">admin</span>
        </p>
        <h1 className="mt-6 font-title text-[44px] leading-none">Connexion</h1>
        <LoginForm />
      </div>
    </main>
  );
}
