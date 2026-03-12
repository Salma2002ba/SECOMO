
import React from 'react';

interface LandingProps {
  onNavigate: (page: 'login' | 'register') => void;
}

const Landing: React.FC<LandingProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-green-500/20">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-zinc-950/70 backdrop-blur-xl z-50 border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-500/25">
              <i className="fas fa-leaf text-xl"></i>
            </div>
            <span className="text-xl font-black tracking-tight text-white">SECOMO</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('login')}
              className="text-sm font-semibold text-zinc-400 hover:text-green-300 transition-colors"
            >
              Connexion
            </button>
            <button
              onClick={() => onNavigate('register')}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-green-500/25 transition-all duration-300 hover:scale-105 active:scale-[0.98]"
            >
              Créer un compte
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-36 pb-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-xs font-bold uppercase tracking-widest text-green-300">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Projet SECOMO Innov 2026
            </div>
            <h1 className="text-5xl lg:text-6xl xl:text-7xl font-black text-white leading-[1.05] tracking-tight">
              La serre connectée{' '}
              <span className="bg-gradient-to-r from-green-300 to-green-500 bg-clip-text text-transparent">
                modulaire.
              </span>
            </h1>
            <p className="text-lg lg:text-xl text-zinc-400 leading-relaxed max-w-lg">
              Capteurs en temps réel, arrosage automatisé et profils de culture : pilotez votre
              écosystème depuis une seule interface, smartphone ou ordinateur.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button
                onClick={() => onNavigate('register')}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white px-8 py-4 rounded-2xl text-base font-bold shadow-xl shadow-green-500/25 transition-all duration-300 hover:scale-105 hover:shadow-green-500/30 active:scale-[0.98] flex items-center justify-center gap-3 group"
              >
                Démarrer maintenant
                <i className="fas fa-arrow-right text-sm group-hover:translate-x-1 transition-transform duration-300" />
              </button>
              <button
                onClick={() => onNavigate('login')}
                className="bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-600/50 hover:border-green-500/40 text-zinc-200 hover:text-green-200 px-8 py-4 rounded-2xl text-base font-bold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center"
              >
                Voir la démo
              </button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-green-500/20 to-green-600/20 rounded-[28px] blur-xl" />
            <div className="relative overflow-hidden rounded-[24px] border border-zinc-700/50 shadow-2xl">
              <img
                src="/hero-secomo.png"
                alt="Serre connectée modulaire SECOMO - système IoT, structure aluminium, capteurs et LED"
                className="w-full object-cover aspect-[4/3]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/40 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 px-6 bg-zinc-900/50 border-y border-zinc-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tight">
              Pensé pour la croissance.
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto text-lg">
              Un système complet pour garantir la santé de vos plantes, quel que soit votre niveau.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: 'fa-chart-line',
                title: 'Suivi temps réel',
                desc: 'Température, humidité, lumière et pH mesurés en continu. Historique et graphiques sur le dashboard.',
              },
              {
                icon: 'fa-robot',
                title: 'Automation',
                desc: "L'arrosage se déclenche selon les seuils de votre profil plante. Réglage manuel possible à tout moment.",
              },
              {
                icon: 'fa-seedling',
                title: 'Profils plantes',
                desc: 'Bibliothèque de cultures (basilic, tomates, menthe…). Créez vos propres profils et appliquez-les à chaque bac.',
              },
              {
                icon: 'fa-bell',
                title: 'Alertes intelligentes',
                desc: 'Notifications en cas de dépassement de seuil, réservoir bas ou anomalie. Restez serein.',
              },
            ].map((item, i) => (
              <div
                key={i}
                className="group bg-zinc-800/50 border border-zinc-700/50 p-8 rounded-2xl hover:border-green-500/30 hover:bg-zinc-800/80 transition-all duration-300"
              >
                <div className="w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center text-xl text-green-400 mb-6 group-hover:scale-105 transition-transform">
                  <i className={`fas ${item.icon}`} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 tracking-tight">{item.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="relative rounded-3xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/50 p-12 lg:p-16 overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl lg:text-4xl font-black text-white mb-10 tracking-tight">
                  Comment ça marche ?
                </h2>
                <div className="space-y-10">
                  {[
                    {
                      step: '1',
                      title: 'Connectez votre bac',
                      desc: 'Branchez le module SECOMO au secteur et à votre Wi-Fi. L’app détecte le bac et le configure en quelques clics. Aucun câblage complexe.',
                    },
                    {
                      step: '2',
                      title: 'Choisissez votre culture',
                      desc: 'Sélectionnez une plante dans la bibliothèque (ou créez un profil personnalisé). Les seuils optimaux (température, humidité, pH, lumière) sont appliqués automatiquement.',
                    },
                    {
                      step: '3',
                      title: 'Laissez SECOMO agir',
                      desc: "Le tableau de bord surveille les capteurs en continu. L'arrosage et les alertes se déclenchent selon les règles définies. Vous gardez la main pour un arrosage manuel si besoin.",
                    },
                    {
                      step: '4',
                      title: 'Consultez et pilotez',
                      desc: "Historique des mesures, météo locale pour adapter l'arrosage, activité des bacs et recommandations : tout est centralisé sur une seule interface, accessible partout.",
                    },
                  ].map((s, i) => (
                    <div key={i} className="flex gap-5">
                      <div className="w-11 h-11 rounded-full border-2 border-green-500/40 flex items-center justify-center font-black text-lg text-green-400 shrink-0 bg-green-500/10">
                        {s.step}
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-white mb-1">{s.title}</h4>
                        <p className="text-zinc-400 text-sm leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-zinc-800/60 backdrop-blur-sm rounded-2xl p-8 border border-zinc-600/50">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-xs font-bold uppercase tracking-widest text-green-400/90">
                    Aperçu dashboard
                  </span>
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                </div>
                <div className="space-y-4">
                  <div className="h-10 bg-zinc-700/50 rounded-xl" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-20 bg-zinc-700/50 rounded-xl" />
                    <div className="h-20 bg-zinc-700/50 rounded-xl" />
                    <div className="h-20 bg-zinc-700/50 rounded-xl" />
                    <div className="h-20 bg-zinc-700/50 rounded-xl" />
                  </div>
                  <div className="h-28 bg-zinc-700/50 rounded-xl" />
                </div>
                <p className="mt-4 text-xs text-zinc-500 font-medium">
                  Capteurs · Historique · Météo · Profil plante · Alertes
                </p>
                <div className="mt-6 py-3 px-4 bg-green-500/20 border border-green-500/30 rounded-xl text-center font-semibold text-sm text-green-300">
                  Démonstration interactive après inscription
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For who */}
      <section className="py-24 px-6 border-t border-zinc-800/50">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl lg:text-4xl font-black text-white mb-4 tracking-tight">
            Pour tous les cultivateurs urbains.
          </h2>
          <p className="text-zinc-400 mb-16 max-w-xl mx-auto">
            Que vous soyez particulier, collectivité ou établissement, SECOMO s’adapte à votre usage.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="w-20 h-20 rounded-2xl bg-zinc-800 border border-zinc-700/50 mx-auto flex items-center justify-center overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1599423300746-b62533397364?auto=format&fit=crop&q=80&w=200"
                  alt="Citadins"
                  className="w-full h-full object-cover"
                />
              </div>
              <h4 className="text-xl font-bold text-white">Citadins</h4>
              <p className="text-zinc-400 text-sm">
                Transformez balcons et rebords de fenêtre en jardins productifs, sans y passer des heures.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-20 h-20 rounded-2xl bg-zinc-800 border border-zinc-700/50 mx-auto flex items-center justify-center overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&q=80&w=200"
                  alt="Copropriétés"
                  className="w-full h-full object-cover"
                />
              </div>
              <h4 className="text-xl font-bold text-white">Copropriétés</h4>
              <p className="text-zinc-400 text-sm">
                Gérez plusieurs bacs partagés (hall, toit, cour) depuis une interface unique et des alertes communes.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-20 h-20 rounded-2xl bg-zinc-800 border border-zinc-700/50 mx-auto flex items-center justify-center overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1503708928676-1cb796a0891e?auto=format&fit=crop&q=80&w=200"
                  alt="Écoles"
                  className="w-full h-full object-cover"
                />
              </div>
              <h4 className="text-xl font-bold text-white">Écoles</h4>
              <p className="text-zinc-400 text-sm">
                Un outil pédagogique idéal pour observer le cycle de vie des plantes et les paramètres d’un écosystème.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 bg-zinc-900 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center text-white">
                <i className="fas fa-leaf text-sm" />
              </div>
              <span className="text-lg font-black tracking-tight text-white">SECOMO</span>
            </div>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Prototype POC pour le programme SECOMO Innov 2026. Une vision moderne de l’agriculture urbaine.
            </p>
          </div>
          <div>
            <h5 className="font-bold mb-6 text-zinc-300">Navigation</h5>
            <ul className="space-y-4 text-sm text-zinc-500 font-medium">
              <li className="hover:text-green-300 cursor-pointer transition-colors" onClick={() => onNavigate('login')}>
                Connexion
              </li>
              <li className="hover:text-green-300 cursor-pointer transition-colors" onClick={() => onNavigate('register')}>
                Inscription
              </li>
              <li className="hover:text-green-300 cursor-pointer transition-colors">Support technique</li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold mb-6 text-zinc-300">Légal</h5>
            <ul className="space-y-4 text-sm text-zinc-500 font-medium">
              <li className="hover:text-green-300 cursor-pointer transition-colors">Confidentialité</li>
              <li className="hover:text-green-300 cursor-pointer transition-colors">Conditions d’usage</li>
              <li className="hover:text-green-300 cursor-pointer transition-colors">Mentions légales</li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold mb-6 text-zinc-300">Newsletter</h5>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Votre email"
                className="bg-zinc-800 border border-zinc-600 rounded-xl px-4 py-2.5 text-sm flex-1 outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 text-white placeholder:text-zinc-500"
              />
              <button className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 p-2.5 rounded-xl text-white transition-all duration-300 hover:scale-105 active:scale-95">
                <i className="fas fa-paper-plane" />
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-zinc-800 text-center text-xs text-zinc-600 font-bold uppercase tracking-widest">
          © 2026 SECOMO POC — Tous droits réservés — Académique
        </div>
      </footer>
    </div>
  );
};

export default Landing;
