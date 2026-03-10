
import React from 'react';

interface AuthProps {
  type: 'login' | 'register';
  onBack: () => void;
  onSwitch: () => void;
  onSuccess: (email: string, password?: string, firstName?: string, lastName?: string, isRegister?: boolean) => void;
}

const Auth: React.FC<AuthProps> = ({ type, onBack, onSwitch, onSuccess }) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [showConditions, setShowConditions] = React.useState(false);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-violet-500/5 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-zinc-900/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-violet-950/30 border border-zinc-700/50 p-8 lg:p-10">
          <button
            onClick={onBack}
            className="absolute top-6 left-6 text-zinc-400 hover:text-violet-400 transition-colors duration-300 p-1 rounded-lg hover:scale-110"
            aria-label="Retour"
          >
            <i className="fas fa-arrow-left text-lg" />
          </button>

          <div className="flex items-center gap-3 pt-2 pb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-violet-500/25">
              <i className="fas fa-leaf text-lg" />
            </div>
            <span className="text-xl font-black tracking-tight text-white">SECOMO</span>
          </div>

          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-violet-500/10 border border-violet-500/20 rounded-xl flex items-center justify-center mx-auto mb-5">
              <i className={`fas ${type === 'login' ? 'fa-lock' : 'fa-user-plus'} text-xl text-violet-400`} />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {type === 'login' ? 'Ravi de vous revoir' : 'Rejoindre SECOMO'}
            </h2>
            <p className="text-zinc-400 text-sm font-medium mt-2">
              {type === 'login' ? 'Accédez à votre dashboard' : 'Créez votre compte et pilotez vos bacs'}
            </p>
          </div>

          <form
            className="space-y-5"
            onSubmit={async (e) => {
              e.preventDefault();
              setError('');
              setLoading(true);
              try {
                if (type === 'register') {
                  await onSuccess(email, password, firstName, lastName, true);
                } else {
                  await onSuccess(email, password);
                }
              } catch (err: any) {
                setError(err.message || 'Erreur de connexion');
              }
              setLoading(false);
            }}
          >
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium">
                <i className="fas fa-circle-exclamation mr-2"></i>{error}
              </div>
            )}

            {type === 'register' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest ml-1">Prénom</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jean"
                    className="w-full bg-zinc-800 border border-zinc-600 rounded-xl py-3.5 px-4 font-medium text-white outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all duration-300 placeholder:text-zinc-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest ml-1">Nom</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Dupont"
                    className="w-full bg-zinc-800 border border-zinc-600 rounded-xl py-3.5 px-4 font-medium text-white outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all duration-300 placeholder:text-zinc-500"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest ml-1">
                Adresse email
              </label>
              <div className="relative">
                <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@exemple.com"
                  className="w-full bg-zinc-800 border border-zinc-600 rounded-xl py-3.5 pl-11 pr-4 font-medium text-white outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all duration-300 placeholder:text-zinc-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest ml-1">
                Mot de passe
              </label>
              <div className="relative">
                <i className="fas fa-key absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-800 border border-zinc-600 rounded-xl py-3.5 pl-11 pr-4 font-medium text-white outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all duration-300 placeholder:text-zinc-500"
                />
              </div>
            </div>

            {type === 'register' && (
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  required
                  className="mt-1 w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-violet-500 focus:ring-violet-500 focus:ring-offset-0 focus:ring-2"
                />
                <span className="text-xs text-zinc-400 font-medium">
                  J'accepte les{' '}
                  <button
                    type="button"
                    onClick={() => setShowConditions(true)}
                    className="text-violet-400 font-semibold hover:text-violet-300 hover:underline transition-colors"
                  >
                    conditions générales d'utilisation
                  </button>
                  {' '}du POC SECOMO
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl transition-all duration-300 shadow-lg shadow-violet-500/25 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><i className="fas fa-spinner fa-spin mr-2"></i>Connexion...</>
              ) : (
                <>{type === 'login' ? 'Se connecter' : 'Créer un compte'}<i className="fas fa-arrow-right text-sm group-hover:translate-x-1 transition-transform duration-300 opacity-80" /></>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-zinc-400 text-sm font-medium">
              {type === 'login' ? 'Pas encore de compte ?' : 'Déjà inscrit ?'}{' '}
              <button
                type="button"
                onClick={onSwitch}
                className="text-violet-400 font-semibold hover:text-violet-300 hover:underline transition-colors"
              >
                Cliquez ici
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Modal Conditions générales */}
      {showConditions && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm"
          onClick={() => setShowConditions(false)}
          aria-modal="true"
          role="dialog"
          aria-label="Conditions générales d'utilisation"
        >
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl shadow-violet-950/30 max-w-lg w-full max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-zinc-700">
              <h3 className="text-lg font-bold text-white">Conditions générales d'utilisation</h3>
              <button
                type="button"
                onClick={() => setShowConditions(false)}
                className="p-2 text-zinc-400 hover:text-violet-400 rounded-xl transition-colors duration-300 hover:scale-110"
                aria-label="Fermer"
              >
                <i className="fas fa-times text-lg" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 text-sm text-zinc-400 space-y-4">
              <p className="font-medium text-zinc-300">
                Les présentes conditions régissent l'utilisation du prototype SECOMO (POC) dans le cadre du programme Innov 2026.
              </p>
              <div>
                <h4 className="font-semibold text-white mb-1">1. Objet</h4>
                <p>Ce service est un prototype de démonstration. Il permet de visualiser et piloter des données simulées liées à une serre connectée modulaire.</p>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">2. Acceptation</h4>
                <p>L'accès et l'utilisation du POC impliquent l'acceptation sans réserve des présentes conditions.</p>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">3. Données et confidentialité</h4>
                <p>Les données saisies peuvent être utilisées à des fins de démonstration et d'évaluation du projet SECOMO.</p>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">4. Limitation</h4>
                <p>Le POC est fourni « en l'état ». Les alertes, l'arrosage et les capteurs sont simulés côté interface.</p>
              </div>
              <p className="text-xs text-zinc-500 pt-2">Dernière mise à jour : 2026.</p>
            </div>
            <div className="p-6 border-t border-zinc-700">
              <button
                type="button"
                onClick={() => setShowConditions(false)}
                className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                J'ai compris
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Auth;
