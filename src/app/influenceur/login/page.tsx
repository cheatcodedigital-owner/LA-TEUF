import { LoginForm } from "./login-form";

export default function AffiliateLoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-card bg-deep-indigo p-8">
        <p className="font-label text-sm uppercase tracking-widest text-solar-copper">LA TEUF · Espace influenceur</p>
        <h1 className="mt-2 font-title text-4xl">Connexion</h1>
        <LoginForm />
        <p className="mt-6 text-sm text-warm-ivory/60">Identifiant et mot de passe : ceux que l&apos;équipe LA TEUF t&apos;a envoyés.</p>
      </div>
    </main>
  );
}
