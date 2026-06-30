/* ===================== CONFIGURATION FIREBASE ===================== */
const firebaseConfig = {
    apiKey: "AIzaSyD481teczPP2DDLtTxeCDZsYH87m6istHY",
    authDomain: "klap-1a042.firebaseapp.com",
    projectId: "klap-1a042",
    storageBucket: "klap-1a042.firebasestorage.app",
    messagingSenderId: "945535729821",
    appId: "1:945535729821:web:bb89af51056b5850e29474"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
console.log("Firebase est connecté avec succès !");

/* ===================== VARIABLES ET DONNÉES LOCALES ===================== */
const TMDB_API_KEY = '8e207f9a855beae327c1d41c88c27219';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p/w780';
let films = [], hotFilmsCache = [], deck = [];
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);

const TMDB_GENRES = { 28: "Action", 12: "Aventure", 16: "Animation", 35: "Comédie", 80: "Crime", 99: "Docu", 18: "Drame", 10751: "Famille", 14: "Fantastique", 36: "Histoire", 27: "Horreur", 10402: "Musique", 9648: "Mystère", 10749: "Romance", 878: "SF", 10770: "Téléfilm", 53: "Thriller", 10752: "Guerre", 37: "Western" };

const DAILY_ACTION_CAP = 40;
const state={
  deckIdx:0, filmIdx:0, 
  points:0, xp:0,
  actionsToday:0, capped:false, justCapped:false,
  watch:new Set(), seen:new Map(), seenTitle:null, seenRating:0, level:1,
  currentTrailerWatchedEnough: false
};
const app=$('#app'), feed=$('#screen-feed'), card=$('#feedCard'), ring=$('#ringProg'), likeWrap=$('#likeWrap');

const QUIZ_LIST = [
    { easy: { q: "À quelle fréquence vas-tu au cinéma ?", opts: ["0-1 fois/mois", "2-3 fois/mois", "4+ fois/mois", "Rarement"], a: 1 }, hard: { q: "Es-tu abonné(e) à une carte illimitée (UGC/Pathé) ?", opts: ["Oui", "Non", "Bientôt", "Jamais"], a: 0 } },
    { easy: { q: "Quel film de SF culte se déroule sur Arrakis ?", opts: ["Dune", "Star Wars", "Blade Runner", "Avatar"], a: 0 }, hard: { q: "Qui a composé la musique de The Batman ?", opts: ["Michael Giacchino", "Hans Zimmer", "Danny Elfman", "Junkie XL"], a: 0 } },
    { easy: { q: "Quel est le nom du vaisseau dans Alien ?", opts: ["Nostromo", "Millennium Falcon", "Enterprise", "Discovery"], a: 0 }, hard: { q: "Qui a réalisé Pulp Fiction ?", opts: ["Quentin Tarantino", "Martin Scorsese", "Steven Spielberg", "David Fincher"], a: 0 } }
];

function show(id){ $(id).classList.add('show'); }
function hide(id){ $(id).classList.remove('show'); }
let toastT=null;
function showToast(t){ const el=$('#toast'); $('#toastTxt').textContent=t; el.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>el.classList.remove('show'),1900); }

/* ===================== LOGIQUE D'AUTHENTIFICATION & SYNCHRONISATION GLOBALE ===================== */
let appInitialized = false;
let isLoginMode = false;

$('#authSwitchBtn').addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    $('#authError').textContent = '';
    
    if (isLoginMode) {
        $('#authTitle').textContent = 'Content de te revoir';
        $('#authMainBtn').textContent = 'Me connecter';
        $('#authSwitchBtn').textContent = "Pas encore de compte ? S'inscrire";
        $('#authPseudo').style.display = 'none'; 
        $('#authEmail').placeholder = 'Ton e-mail ou pseudo'; 
        $('#btnForgotPass').style.display = 'block'; 
    } else {
        $('#authTitle').textContent = 'Créer un compte';
        $('#authMainBtn').textContent = 'Rejoindre la commu';
        $('#authSwitchBtn').textContent = 'Déjà un compte ? Me connecter';
        $('#authPseudo').style.display = 'block'; 
        $('#authEmail').placeholder = 'Ton e-mail';
        $('#btnForgotPass').style.display = 'none'; 
    }
});

auth.onAuthStateChanged(user => {
    if(user) {
        hide('#ovAuth');
        
        db.collection('users').doc(user.uid).onSnapshot(doc => {
            if(doc.exists) {
                const data = doc.data();
                state.points = data.points != null ? data.points : 0;
                state.xp = data.xp != null ? data.xp : 0;
                state.level = data.level != null ? data.level : 1;
                state.actionsToday = data.actionsToday != null ? data.actionsToday : 0;
                
                // SYNCHRONISATION DES SWIPES (Envies / Vus)
                state.watch = new Set(data.watch || []);
                state.seen = new Map(Object.entries(data.seen || {}));
                updateWatchUI();
                updateSeenUI();
                
                $$('[data-pts]').forEach(el => el.textContent = state.points);
                const lvlTexts = {1:'Spectateur (x1)', 2:'Figurant (x1.1)', 3:'Caméo (x1.2)', 4:'2nd Rôle (x1.3)', 5:"Tête d'Affiche (x1.5)", 6:'Star (x1.8)', 7:'Réalisateur (x2)', 8:'Légende (x2.5)', 9:'Mythe (x3)'};
                if($('.p-status span')) $('.p-status span').textContent = `⭐ Niveau : ${lvlTexts[state.level] || 'Spectateur'}`;
                
                if($('.p-id h1')) {
                    $('.p-id h1').textContent = data.pseudo ? `@${data.pseudo}` : 'Mon Profil';
                }
                
                updateEnergyUI();
                
                if($('#screen-profil').classList.contains('active')) renderBoard('friends');
            }
            
            if(!appInitialized) {
                show('#ovTuto');
                initTMDB();
                appInitialized = true;
            }
        });

        // SYSTEME DE NOTIFICATIONS
        db.collection('users').doc(user.uid).collection('notifications').orderBy('timestamp', 'desc').onSnapshot(snapshot => {
            const count = $('#notifCount');
            const previewText = $('#notifPreviewText');
            const fullList = $('#fullNotifList');
            if(!count || !fullList) return;
            
            count.textContent = snapshot.size;
            fullList.innerHTML = '';
            
            if(snapshot.empty) {
                previewText.textContent = "Tu es à jour !";
                fullList.innerHTML = '<p class="p-note" style="text-align:center;">Aucune notification pour le moment.</p>';
            } else {
                let isFirst = true;
                snapshot.forEach(doc => {
                    const n = doc.data();
                    if(isFirst) {
                        previewText.textContent = `Dernière : ${n.title || 'Nouvelle alerte'}`;
                        isFirst = false;
                    }
                    const item = document.createElement('div');
                    item.style.cssText = "background:rgba(255,255,255,0.05); padding:16px; border-radius:16px; font-size:14px; display:flex; align-items:flex-start; gap:12px; border-left:3px solid var(--hype);";
                    item.innerHTML = `<div style="font-size:20px;">${n.icon || '💬'}</div><div><b style="color:#fff; font-size:15px;">${n.title}</b><br><span style="font-size:13px; color:rgba(255,255,255,0.7); line-height:1.4; display:block; margin-top:4px;">${n.text}</span></div>`;
                    fullList.appendChild(item);
                });
            }
        });

    } else {
        show('#ovAuth');
    }
});

// GESTION DU MOT DE PASSE OUBLIÉ
$('#btnForgotPass').addEventListener('click', async () => {
    const loginId = $('#authEmail').value.trim();
    const errorMsg = $('#authError');
    errorMsg.textContent = '';

    if(!loginId) {
        errorMsg.style.color = "#FF2D6B";
        errorMsg.textContent = 'Renseigne ton e-mail ou pseudo ci-dessus puis clique ici.';
        return;
    }

    let emailToUse = loginId;
    if(!loginId.includes('@')) {
        try {
            const snap = await db.collection('users').where('pseudo', '==', loginId.toLowerCase()).get();
            if(snap.empty) {
                errorMsg.style.color = "#FF2D6B";
                errorMsg.textContent = "Aucun compte trouvé avec ce pseudo.";
                return;
            }
            emailToUse = snap.docs[0].data().email;
        } catch(e) {
            errorMsg.style.color = "#FF2D6B";
            errorMsg.textContent = "Erreur de connexion au serveur.";
            return;
        }
    }

    auth.sendPasswordResetEmail(emailToUse).then(() => {
        showToast("E-mail de réinitialisation envoyé !");
        errorMsg.style.color = "var(--mint)";
        errorMsg.textContent = "Regarde ta boîte mail (et tes spams) !";
        setTimeout(() => { errorMsg.style.color = "#FF2D6B"; errorMsg.textContent = ""; }, 5000);
    }).catch(err => {
        errorMsg.style.color = "#FF2D6B";
        errorMsg.textContent = "Erreur : " + err.message;
    });
});


// INSCRIPTION ET CONNEXION PRINCIPALE
$('#authMainBtn').addEventListener('click', async () => {
    const loginId = $('#authEmail').value.trim(); 
    const pass = $('#authPass').value.trim();
    const pseudo = $('#authPseudo').value.trim().toLowerCase();
    const errorMsg = $('#authError');
    errorMsg.style.color = "#FF2D6B";
    errorMsg.textContent = '';
    
    if (isLoginMode) {
        if(!loginId || !pass) { errorMsg.textContent = 'Merci de remplir tous les champs.'; return; }
        let emailToUse = loginId;
        if(!loginId.includes('@')) {
            try {
                const snap = await db.collection('users').where('pseudo', '==', loginId.toLowerCase()).get();
                if(snap.empty) { errorMsg.textContent = "Aucun compte trouvé avec ce pseudo."; return; }
                emailToUse = snap.docs[0].data().email;
            } catch(e) { errorMsg.textContent = "Erreur de connexion au serveur."; return; }
        }
        auth.signInWithEmailAndPassword(emailToUse, pass).catch(err => { errorMsg.textContent = 'E-mail, pseudo ou mot de passe incorrect.'; });
    } else {
        if(!loginId || !pass || !pseudo) { errorMsg.textContent = 'Merci de remplir tous les champs.'; return; }
        if(!loginId.includes('@')) { errorMsg.textContent = 'Merci de fournir une adresse e-mail valide.'; return; }
        if(pseudo.length < 3 || pseudo.includes(' ')) { errorMsg.textContent = 'Ton pseudo doit faire au moins 3 caractères sans espace.'; return; }
        
        try {
            const pseudoCheck = await db.collection('users').where('pseudo', '==', pseudo).get();
            if(!pseudoCheck.empty) { errorMsg.textContent = "Aïe, ce pseudo est déjà pris ! Choisis-en un autre."; return; }
            
            const userCred = await auth.createUserWithEmailAndPassword(loginId, pass);
            
            await db.collection('users').doc(userCred.user.uid).set({
                email: userCred.user.email,
                pseudo: pseudo,
                points: 0,
                xp: 0,
                level: 1,
                actionsToday: 0,
                friends: [],
                watch: [],
                seen: {}
            });
            
        } catch(err) {
            if(err.code === 'auth/weak-password') errorMsg.textContent = 'Mot de passe trop court (6 car. min).';
            else if(err.code === 'auth/email-already-in-use') errorMsg.textContent = 'Cet e-mail est déjà utilisé.';
            else errorMsg.textContent = 'Erreur : ' + err.message;
        }
    }
});

/* ===================== AJOUT D'AMIS & NOTIFICATIONS ===================== */

// Ouvrir le panneau complet des notifications
$('#btnOpenNotifs').addEventListener('click', () => {
    show('#ovNotifs');
});

$('#btnInvite').addEventListener('click', () => { 
    $('#searchFriendEmail').value = '';
    $('#friendSearchResult').textContent = '';
    show('#ovAddFriend'); 
});

$('#btnSearchFriend').addEventListener('click', async () => {
    const searchTerm = $('#searchFriendEmail').value.trim().toLowerCase();
    const resEl = $('#friendSearchResult');
    if(!searchTerm) return;
    
    const currentUser = auth.currentUser;
    if(!currentUser) return;

    resEl.innerHTML = "<span style='color:var(--txt2)'>Recherche en cours... 🔎</span>";
    
    try {
        let snapshot = await db.collection('users').where('pseudo', '==', searchTerm).get();
        if(snapshot.empty) snapshot = await db.collection('users').where('email', '==', searchTerm).get();
        
        if(snapshot.empty) {
            resEl.innerHTML = "<span style='color:var(--txt3)'>Aucun compte trouvé avec ce pseudo ou e-mail.</span>";
        } else {
            const friendDoc = snapshot.docs[0];
            const friendId = friendDoc.id;
            const friendData = friendDoc.data();
            
            if(friendId === currentUser.uid) {
                resEl.innerHTML = "<span style='color:var(--txt2)'>Tu ne peux pas t'ajouter toi-même !</span>";
                return;
            }
            
            const friendPseudo = friendData.pseudo || friendData.email.split('@')[0];
            const myDoc = await db.collection('users').doc(currentUser.uid).get();
            const myPseudo = myDoc.data().pseudo || currentUser.email.split('@')[0];

            await db.collection('users').doc(currentUser.uid).update({ friends: firebase.firestore.FieldValue.arrayUnion(friendId) });
            await db.collection('users').doc(friendId).update({ friends: firebase.firestore.FieldValue.arrayUnion(currentUser.uid) });

            await db.collection('users').doc(friendId).collection('notifications').add({
                icon: "🤝",
                title: "Nouveau membre dans ton réseau !",
                text: `@${myPseudo} t'a ajouté(e) en ami. Tu peux désormais vous comparer au classement.`,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            resEl.innerHTML = `<span style='color:var(--mint)'>🎉 @${friendPseudo} a été ajouté(e) !</span>`;
            showToast("Ami ajouté au réseau !");
            setTimeout(() => { hide('#ovAddFriend'); renderBoard('friends'); }, 1800);
        }
    } catch(error) {
        console.error(error);
        resEl.innerHTML = "<span style='color:var(--hype)'>Erreur lors de la recherche.</span>";
    }
});


/* ===================== LECTEUR YOUTUBE ===================== */
let ytPlayerReady = false;
let ytPlayer;
let isMuted = true;

window.onYouTubeIframeAPIReady = function() {
    ytPlayer = new YT.Player('ytPlayer', {
        height: '100%', width: '100%',
        playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, rel: 0, showinfo: 0, mute: 1, playsinline: 1, loop: 1 },
        events: {
            onReady: () => { 
                ytPlayerReady = true; 
                if(films.length > 0 && feed.dataset.mode === 'trailer') renderTrailer(state.filmIdx);
            },
            onStateChange: (event) => { 
                if (event.data === YT.PlayerState.PLAYING) {
                    $('#fcVideoContainer').style.opacity = 1;
                    $('#fcPosterClear').style.opacity = 0;
                }
                if (event.data === YT.PlayerState.ENDED) { 
                    ytPlayer.seekTo(0); ytPlayer.playVideo(); 
                } 
            }
        }
    });
};

$('#btnMute').addEventListener('click', () => {
    if(!ytPlayerReady) return;
    isMuted = !isMuted;
    if(isMuted) { ytPlayer.mute(); $('#btnMute').textContent = '🔇'; } 
    else { ytPlayer.unMute(); $('#btnMute').textContent = '🔊'; }
});

$$('[data-tuto-close]').forEach(el => el.addEventListener('click', () => {
    hide('#ovTuto');
    isMuted = false;
    $('#btnMute').textContent = '🔊';
    if(ytPlayerReady && ytPlayer && ytPlayer.unMute) {
        ytPlayer.unMute();
        ytPlayer.playVideo(); 
    }
    restartRing();
}));

/* ===================== INIT TMDB ===================== */

async function initTMDB() {
  try {
    const res = await fetch(`${TMDB_BASE}/movie/now_playing?api_key=${TMDB_API_KEY}&language=fr-FR&region=FR`);
    const data = await res.json();
    
    const detailedFilms = await Promise.all(data.results.slice(0, 15).map(async (m, idx) => {
        const dRes = await fetch(`${TMDB_BASE}/movie/${m.id}?api_key=${TMDB_API_KEY}&append_to_response=videos,credits&include_video_language=fr,en,null`);
        const d = await dRes.json();
        const vids = d.videos?.results || [];
        
        let trailer = vids.find(v => v.type === 'Trailer' && v.site === 'YouTube' && v.iso_639_1 === 'fr');
        if(!trailer) trailer = vids.find(v => v.type === 'Trailer' && v.site === 'YouTube');
        if(!trailer) trailer = vids.find(v => v.site === 'YouTube');
        
        const relDate = new Date(m.release_date);
        const diffDays = Math.ceil((relDate - new Date()) / (1000 * 60 * 60 * 24));
        let realWeek = 'now';
        if (diffDays > 14) realWeek = 'avenir';
        else if (diffDays > 7) realWeek = 'next';
        else if (diffDays > 0) realWeek = 'this';

        const rt = d.runtime || 120; 
        const durationReal = Math.floor(rt/60) + "h" + (rt%60).toString().padStart(2, '0');
        const castReal = d.credits?.cast?.slice(0, 2).map(c => c.name).join(' · ') || "Casting à découvrir";
        
        return {
            title: m.title, dist: "Au cinéma", 
            genre: m.genre_ids.length ? (TMDB_GENRES[m.genre_ids[0]] || "Cinéma") : "Cinéma", 
            released: (realWeek === 'now' || realWeek === 'this'), 
            svod: null, 
            week: realWeek, 
            dateShort: "En salle",
            rating: m.vote_average ? parseFloat((m.vote_average / 2).toFixed(1)) : 4.0,
            hype: Math.min(98, Math.max(50, Math.round(m.vote_average * 10))),
            duration: durationReal,
            poster: `${IMG_BASE}${m.poster_path}`,
            cast: castReal, syn: m.overview || "Découvrez ce film actuellement en salle.",
            ytKey: trailer ? trailer.key : 'zSWdZVtXT7E' 
        };
    }));

    films = detailedFilms.filter(f => f.poster);

    deck = [];
    films.forEach((f, i) => {
      deck.push({ kind: "trailer", film: i });
      
      if(i === 2 && films.length > 3) {
        deck.push({ kind: "ab", duel: { tag: "Lequel veux-tu le plus voir ?", sub: "Tape pour voter — résultat en direct", 
          a: { name: films[0].title, g: `url('${films[0].poster}')`, pct: 68 }, 
          b: { name: films[1].title, g: `url('${films[1].poster}')`, pct: 32 } } });
      }
      if(i % 2 !== 0 && QUIZ_LIST[i % QUIZ_LIST.length]) {
        deck.push({ kind: "quiz", q: QUIZ_LIST[i % QUIZ_LIST.length] });
      }
    });

    renderCard(0);
    renderSorties();
    updateWatchUI();
    updateSeenUI();
    updateEnergyUI();

  } catch (error) {
    console.error("Erreur TMDB :", error);
    showToast("Impossible de charger les films");
  }
}

function currentFilm(){ return films[state.filmIdx]; }
function getFilmByTitle(title) { return films.find(x => x.title === title) || (hotFilmsCache && hotFilmsCache.find(x => x.title === title)); }
function starsString(r){ const n=Math.round(r); let s=''; for(let k=0;k<5;k++) s+= k<n?'★':'☆'; return s; }
function grp(n){ return (''+n).replace(/\B(?=(\d{3})+(?!\d))/g,' '); }
function animateValue(el,a,b,dur){
  const t0=performance.now();
  (function step(t){ const k=Math.min(1,(t-t0)/dur); el.textContent=Math.round(a+(b-a)*(1-Math.pow(1-k,3))); if(k<1)requestAnimationFrame(step); })(t0);
}

/* ===================== GESTION DES POINTS & ENREGISTREMENT SERVER ===================== */

function getMultiplier(level) {
    const mults = {1:1, 2:1.1, 3:1.2, 4:1.3, 5:1.5, 6:1.8, 7:2, 8:2.5, 9:3};
    return mults[level] || 1;
}

function updateEnergyUI() {
  const current = state.actionsToday;
  const max = DAILY_ACTION_CAP;
  const remaining = max - current;
  const pct = Math.min(100, (current / max) * 100);
  
  const countEl = $('#energyCount');
  const barEl = $('#energyBar');
  const noteEl = $('#energyNote');
  
  if(countEl) countEl.textContent = `${current} / ${max}`;
  if(barEl) barEl.style.width = `${pct}%`;
  
  if(noteEl) {
    if(remaining > 0) {
      noteEl.textContent = `Encore ${remaining} action${remaining > 1 ? 's' : ''} pour maximiser tes gains aujourd'hui.`;
    } else {
      noteEl.textContent = "Quota atteint 🌙 Swipe juste pour le fun !";
    }
  }
}

function addPoints(baseValue){
  if(state.capped) return 0;
  
  state.actionsToday++;
  updateEnergyUI();
  
  const mult = getMultiplier(state.level);
  const gain = Math.round(baseValue * mult); 
  
  state.xp += baseValue; 
  state.points += gain;

  const user = auth.currentUser;
  if(user) {
      db.collection('users').doc(user.uid).update({
          points: state.points,
          xp: state.xp,
          actionsToday: state.actionsToday
      }).catch(e => console.error("Erreur de sauvegarde:", e));
  }
  
  if(gain > 0) { 
      const from = parseInt($('.pts-num').textContent) || 0;
      $$('[data-pts]').forEach(el => animateValue(el, from, state.points, 500)); 
  }
  
  if(state.actionsToday >= DAILY_ACTION_CAP && !state.capped) { 
      state.capped = true; 
      state.justCapped = true; 
      likeWrap.classList.add('capped'); 
      ring.style.animation = 'none'; 
      ring.style.strokeDashoffset = 0; 
  }
  return gain;
}

function getSwipeGain() {
    if (!state.currentTrailerWatchedEnough) {
        if (!state.capped) showToast('Trop rapide ! Regarde au moins 8s pour cumuler des points ⏱️');
        addPoints(0); 
        return 0; 
    }
    return addPoints(5);
}

let capPending=null;
function openCap(then){ capPending=then; show('#ovCap'); }
$$('[data-cap-close]').forEach(el=>el.addEventListener('click',()=>{ hide('#ovCap'); const t=capPending; capPending=null; if(t)setTimeout(t,160); }));

function restartRing(){
  likeWrap.classList.remove('charged');
  if(state.capped){ ring.style.animation='none'; ring.style.strokeDashoffset=0; return; }
  ring.style.strokeDashoffset=''; ring.style.animation='none'; void ring.offsetWidth; ring.style.animation='';
}
ring.addEventListener('animationend',()=>{ if(!state.capped) likeWrap.classList.add('charged'); });

function resetCard(){ card.style.transition='none'; card.style.transform=''; $('#stampLike').style.opacity=0; $('#stampNope').style.opacity=0; }

function renderTrailer(filmIndex){
  state.filmIdx=filmIndex; const f=films[filmIndex];
  feed.dataset.mode='trailer';
  
  $('#fcBg').style.background = f.poster ? `url('${f.poster}') center/cover no-repeat` : '#16161F';
  
  $('#fcPosterClear').style.backgroundImage = f.poster ? `url('${f.poster}')` : 'none';
  $('#fcVideoContainer').style.opacity = 0;
  $('#fcPosterClear').style.opacity = 1;
  
  if (ytPlayerReady && f.ytKey) {
      ytPlayer.loadVideoById({videoId: f.ytKey});
      if(isMuted) ytPlayer.mute(); else ytPlayer.unMute();
      ytPlayer.playVideo();
      setTimeout(() => {
          $('#fcVideoContainer').style.opacity = 1;
          $('#fcPosterClear').style.opacity = 0;
      }, 1500);
  } else {
      if (ytPlayerReady) ytPlayer.stopVideo();
  }

  $('#fmTitle').textContent=f.title; $('#fmGenre').textContent=f.genre;
  $('#fmMeta').innerHTML= f.released ? `En salle · <b>${f.duration}</b>` : `${f.dateShort} · <b>${f.duration}</b>`;
  restartRing();
}

function renderQuiz(qp){
  feed.dataset.mode='quiz'; if(ytPlayerReady) ytPlayer.stopVideo();
  const hard = state.level>=4; const q = hard ? qp.hard : qp.easy;
  $('#quizTag').textContent = hard ? `🧠 Quiz · Niveau ${state.level} · Expert` : `🧠 Quiz · Niveau ${state.level} · Facile`;
  $('#quizQ').textContent=q.q;
  const grid=$('#quizGrid'); grid.innerHTML='';
  q.opts.forEach((opt,k)=>{
    const b=document.createElement('button'); b.className='cq-opt'; b.textContent=opt;
    b.addEventListener('click',()=>answerQuiz(b,k,q),{once:true});
    grid.appendChild(b);
  });
}
function answerQuiz(btn,k,q){
  const opts=[...$('#quizGrid').children]; opts.forEach(o=>o.style.pointerEvents='none');
  if(k===q.a){ btn.classList.add('correct'); flash('go'); const g=addPoints(20);
    showToast(g>0?('Bonne réponse ! +'+g+' pts'):'Bonne réponse ! 🌙 Quota du jour atteint');
    if(state.justCapped) state.justCapped=false;
  } else {
    btn.classList.add('wrong'); opts[q.a].classList.add('correct'); flash('no');
    showToast('Raté ! La bonne réponse : '+q.opts[q.a]);
  }
  setTimeout(nextCard,1550);
}

function renderAb(d){
  feed.dataset.mode='ab'; if(ytPlayerReady) ytPlayer.stopVideo();
  $('#abAbg').style.backgroundImage = d.a.g; $('#abAph').style.backgroundImage = d.a.g;
  $('#abBbg').style.backgroundImage = d.b.g; $('#abBph').style.backgroundImage = d.b.g;
  
  $('#abApct').textContent=""; $('#abBpct').textContent="";
  $('#abVsTitle').textContent="Lequel veux-tu le plus voir ?";
  
  const A=$('#abA'),B=$('#abB'); A.className='ab-half'; B.className='ab-half';
  A.onclick=()=>pickAb(A,B,d.a.pct); B.onclick=()=>pickAb(B,A,d.b.pct);
}
function pickAb(win,lose,pct){
  win.onclick=null; lose.onclick=null; win.classList.add('win'); lose.classList.add('lose');
  $('#abVsTitle').textContent=`Tu rejoins la majorité !`;
  
  const isA = (win.id === 'abA');
  $('#abApct').textContent = (isA ? pct : 100 - pct) + '%';
  $('#abBpct').textContent = (!isA ? pct : 100 - pct) + '%';

  $('#cardAb').classList.add('voted');
  setTimeout(()=>{ $('#cardAb').classList.remove('voted'); nextCard(); }, 3000); 
}

function renderPerson(d) {
    feed.dataset.mode='person'; if(ytPlayerReady) ytPlayer.stopVideo();
    $('#cpPhoto').style.background = d.img;
    $('#cpName').textContent = d.name;
}
function votePerson(like) { 
    flash(like ? 'go' : 'no'); 
    addPoints(10); 
    const pct = Math.floor(Math.random() * 15) + 75;
    const likePct = like ? pct : 100 - pct;
    $('#prLike').textContent = likePct + '%';
    $('#prDislike').textContent = (100 - likePct) + '%';
    setTimeout(() => { show('#ovPersonResult'); }, 500); 
}
$('#btnPersonNext').addEventListener('click', () => { hide('#ovPersonResult'); nextCard(); });

function flash(t){ const f=$('#flash'); f.className='flash'; void f.offsetWidth; f.classList.add(t); }

function renderCard(i){
  state.deckIdx=((i%deck.length)+deck.length)%deck.length;
  const c=deck[state.deckIdx]; resetCard();
  if(c.kind==='trailer') renderTrailer(c.film);
  else if(c.kind==='quiz') renderQuiz(c.q);
  else if(c.kind==='ab') renderAb(c.duel);
  else if(c.kind==='person') renderPerson(c);
}
function nextCard(){ renderCard(state.deckIdx+1); }

/* ===================== LOGIQUE DE MATCH EN DIRECT ===================== */

// Vérifie si les amis ont déjà le film dans leurs envies
async function checkForMatch(movieTitle) {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;

    try {
        const myDoc = await db.collection('users').doc(currentUser.uid).get();
        const friends = myDoc.data().friends || [];

        if (friends.length === 0) return null;

        let matchedFriends = [];
        
        const friendDocs = await Promise.all(friends.map(id => db.collection('users').doc(id).get()));

        friendDocs.forEach(doc => {
            if (doc.exists) {
                const friendData = doc.data();
                const friendWatch = friendData.watch || []; 

                if (friendWatch.includes(movieTitle)) {
                    matchedFriends.push({
                        id: doc.id,
                        name: friendData.pseudo || friendData.email.split('@')[0]
                    });
                }
            }
        });

        return matchedFriends.length > 0 ? matchedFriends : null;
    } catch (error) {
        console.error("Erreur lors de la vérification du Match :", error);
        return null;
    }
}

// Envoie une notification silencieuse aux amis passifs
async function notifyFriendsOfMatch(f, matchedFriends) {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const myDoc = await db.collection('users').doc(currentUser.uid).get();
    const myPseudo = myDoc.data().pseudo || 'Un ami';

    matchedFriends.forEach(friend => {
        db.collection('users').doc(friend.id).collection('notifications').add({
            icon: "🔥",
            title: "It's a Match !",
            text: `@${myPseudo} a aussi ajouté « ${f.title} » à ses envies. Écris-lui pour organiser la séance !`,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    });
}

/* ===================== SWIPE & SYNCHRO CLOUD ===================== */
let dragging=false,startX=0,dx=0;
card.addEventListener('pointerdown',e=>{
  if(feed.dataset.mode!=='trailer' || app.classList.contains('cinema'))return;
  dragging=true; startX=e.clientX; dx=0; card.style.transition='none'; card.setPointerCapture(e.pointerId);
});
card.addEventListener('pointermove',e=>{
  if(!dragging)return; dx=e.clientX-startX;
  card.style.transform=`translateX(${dx}px) rotate(${dx*0.045}deg)`;
  $('#stampLike').style.opacity=Math.max(0,Math.min(1,dx/90));
  $('#stampNope').style.opacity=Math.max(0,Math.min(1,-dx/90));
});
card.addEventListener('pointerup',()=>{
  if(!dragging)return; dragging=false; const T=92;
  if(dx>T) fly('right'); else if(dx<-T) fly('left');
  else { if(Math.abs(dx)<8) openSheetByTitle(films[state.filmIdx].title); snapBack(); }
});
card.addEventListener('pointercancel',()=>{ dragging=false; snapBack(); });
function snapBack(){ card.style.transition='transform .35s var(--ease)'; card.style.transform=''; $('#stampLike').style.opacity=0; $('#stampNope').style.opacity=0; }

function fly(side){
  if(feed.dataset.mode!=='trailer')return;
  
  state.currentTrailerWatchedEnough = (ytPlayerReady && ytPlayer.getCurrentTime() >= 8);
  
  if(side==='right') addToWatch(films[state.filmIdx].title);
  card.style.transition='transform .3s ease-in';
  card.style.transform = side==='right' ? 'translateX(135%) rotate(18deg)' : 'translateX(-135%) rotate(-18deg)';
  $('#stampLike').style.opacity=side==='right'?1:0; $('#stampNope').style.opacity=side==='left'?1:0;
  setTimeout(()=>openQualif(side),300);
}

function toggleWatch(title){ 
    if(state.watch.has(title)) state.watch.delete(title); else state.watch.add(title); 
    
    if(auth.currentUser) {
        db.collection('users').doc(auth.currentUser.uid).update({ watch: Array.from(state.watch) })
          .catch(e => console.error("Erreur de sauvegarde Watchlist", e));
    }
    updateWatchUI(); 
}

function addToWatch(title){ 
    state.watch.add(title);
    if(auth.currentUser) {
        db.collection('users').doc(auth.currentUser.uid).update({ watch: Array.from(state.watch) });
    }
    updateWatchUI(); 
}

/* ===================== QUALIF ET ENCHAINEMENT ===================== */
function openQualif(side){
  const gain = getSwipeGain(); 
  if(side==='right') { showFeedback({pct:hypePct(currentFilm()), action:'like', gain, then:nextCard}); }
  else { showFeedback({pct:hypePct(currentFilm()), action:'nope', gain, then:nextCard}); }
}
function closeQualif(){ hide('#ovQualLeft'); hide('#ovQualRight'); }

$$('#ovQualLeft .qbtn, #ovQualRight .qbtn').forEach(b=>b.addEventListener('click',()=>{
  closeQualif(); 
  if(b.dataset.q==='left') { 
      showFeedback({pct:hypePct(currentFilm()), action:'nope', gain:0, then:nextCard}); 
  } else { 
      show('#ovAttr'); 
  } 
}));
$$('[data-cancel-qual]').forEach(el=>el.addEventListener('click',()=>{ closeQualif(); snapBack(); }));

$$('[data-attr]').forEach(b=>b.addEventListener('click',afterRightData));
$$('[data-attr-skip]').forEach(el=>el.addEventListener('click',afterRightData));

async function afterRightData(){
  hide('#ovAttr'); 
  const then = nextCard, f = currentFilm(); 
  
  const matchedFriends = await checkForMatch(f.title);

  if(matchedFriends && matchedFriends.length > 0) {
      state.justCapped = false; 
      openMatch(f, matchedFriends);
      return;
  }

  if(state.justCapped){ state.justCapped=false; openCap(then); return; }
  showFeedback({pct:hypePct(f), action:'like', gain:0, then});
}

function openSheetByTitle(title){
  const f = getFilmByTitle(title);
  if(!f) return;
  $('#shPoster').style.background=f.poster ? `url('${f.poster}') center/cover no-repeat` : '#16161F'; 
  $('#shTitle').textContent=f.title;
  $('#shSub').textContent=`Au cinéma · ${f.genre} · ${f.duration}`;
  $('#shCast').textContent='Avec '+f.cast; $('#shSyn').textContent=f.syn;
  $('#shScoreBlock').style.display='none'; $('#shHypeBlock').style.display=''; $('#shHype').textContent=f.hype+'%';
  
  const w=$('#shWish'), isAdded=state.watch.has(title);
  w.classList.toggle('added',isAdded); w.textContent=isAdded?'✓ Dans mes envies':'♥ Ajouter à mes envies';
  w.onclick = () => {
    toggleWatch(title);
    const nowAdded=state.watch.has(title);
    w.classList.toggle('added',nowAdded); w.textContent=nowAdded?'✓ Dans mes envies':'♥ Ajouter à mes envies';
  };
  show('#ovSheet');
  requestAnimationFrame(()=>{ $('#shHypeBar').style.width=f.hype+'%'; });
}
function closeSheet(){ hide('#ovSheet'); $('#shHypeBar').style.width=0; }
$('#filmInfo').addEventListener('click',() => openSheetByTitle(films[state.filmIdx].title));
$$('[data-close]').forEach(el=>el.addEventListener('click',()=>{ const ov=el.closest('.ov'); if(ov.id==='ovSheet') closeSheet(); else hide('#'+ov.id); }));

$('#btnNope').addEventListener('click',()=>fly('left'));
$('#btnLike').addEventListener('click',()=>fly('right'));

$('#btnSeen').addEventListener('click',()=>{ 
    const f=currentFilm(); 
    if(feed.dataset.mode!=='trailer') return;
    openStars(f.title); 
});
const starBtns=$$('#starsRow .star');
function openStars(title){ 
  $('#starsFilm').textContent=`Pour « ${title} »`; 
  state.seenTitle = title; 
  state.seenRating=0;
  starBtns.forEach(x=>x.classList.remove('on')); $('#starsNext').disabled=true; show('#ovStars'); 
}
starBtns.forEach(b=>b.addEventListener('click',()=>{
  state.seenRating=+b.dataset.v;
  starBtns.forEach(x=>x.classList.toggle('on',+x.dataset.v<=state.seenRating));
  $('#starsNext').disabled=false;
}));
$('#starsNext').addEventListener('click',()=>{ if(state.seenRating<1)return; hide('#ovStars'); show('#ovSeen'); });
$$('[data-close-stars]').forEach(el=>el.addEventListener('click',()=>hide('#ovStars')));
$$('#ovSeen .qbtn').forEach(b=>b.addEventListener('click',()=>{ hide('#ovSeen'); finalizeSeen(); }));
$$('[data-close-seen]').forEach(el=>el.addEventListener('click',()=>hide('#ovSeen')));

function finalizeSeen(){
  state.seen.set(state.seenTitle, state.seenRating);
  
  if(auth.currentUser) {
      db.collection('users').doc(auth.currentUser.uid).update({ seen: Object.fromEntries(state.seen) })
        .catch(e => console.error("Erreur de sauvegarde Seen", e));
  }
  updateSeenUI();
  
  const gain=addPoints(10);
  
  if ($('#screen-feed').classList.contains('active')) {
      const then = nextCard;
      if(state.justCapped){ state.justCapped=false; openCap(then); }
      else showFeedback({pct:hypePct(currentFilm()), action:'like', gain, then});
  } else {
      if(state.justCapped) { state.justCapped=false; showToast('Film noté ! Quota atteint 🌙'); }
      else showToast(`+${gain} pts ! Film marqué comme vu.`);
  }
}

function openMatch(f, matchedFriends){
  $('#matchPoster').style.background = f.poster ? `url('${f.poster}') center/cover no-repeat` : f.g;

  const firstFriend = matchedFriends[0].name;
  const othersCount = matchedFriends.length - 1;
  let subText = `@${firstFriend} veut aussi voir « ${f.title} ».`;
  if (othersCount === 1) subText = `@${firstFriend} et 1 ami veulent aussi voir « ${f.title} ».`;
  if (othersCount > 1) subText = `@${firstFriend} et ${othersCount} amis veulent aussi voir « ${f.title} ».`;
  $('#matchSub').textContent = subText;

  const bubblesContainer = $('#matchBubbles');
  bubblesContainer.innerHTML = '';
  const colors = ['var(--hype)', 'var(--electric)', 'var(--gold)'];

  matchedFriends.slice(0, 3).forEach((friend, idx) => {
      const bub = document.createElement('span');
      bub.className = `bub b${idx+1}`;
      const color = colors[idx % colors.length];
      bub.style.background = color;
      if (color === 'var(--gold)') bub.style.color = '#1a1a1a'; 
      bub.textContent = friend.name.charAt(0).toUpperCase();
      bubblesContainer.appendChild(bub);
  });

  if (matchedFriends.length > 3) {
      const extra = document.createElement('span');
      extra.className = 'bub b3';
      extra.style.background = 'var(--gold)';
      extra.style.color = '#1a1a1a';
      extra.textContent = `+${matchedFriends.length - 3}`;
      bubblesContainer.appendChild(extra);
  }

  notifyFriendsOfMatch(f, matchedFriends);
  populateMatchFriendsList(matchedFriends);

  spawnConfetti(); 
  show('#ovMatch');
}

function closeMatch(){ hide('#ovMatch'); $('#confetti').innerHTML=''; }
$('#btnBackSwipe').addEventListener('click',()=>{ closeMatch(); nextCard(); });

function populateMatchFriendsList(matchedFriends) {
    const list = $('#matchFriendsList');
    if (!list) return;
    list.innerHTML = '';
    const colors = ['var(--hype)', 'var(--electric)', 'var(--gold)'];

    matchedFriends.forEach((friend, idx) => {
        const color = colors[idx % colors.length];
        const colorStyle = color === 'var(--gold)' ? `background:${color};color:#1a1a1a` : `background:${color}`;

        list.innerHTML += `
        <button class="qcm-opt friend-btn" data-friend="${friend.id}">
            <div style="display:flex;align-items:center;">
                <span class="f-av" style="${colorStyle}">${friend.name.charAt(0).toUpperCase()}</span>
                @${friend.name}
            </div>
        </button>`;
    });

    $$('.friend-btn').forEach(b => b.addEventListener('click', () => {
        b.classList.toggle('sel');
        $('#btnSendInvites').disabled = $$('.friend-btn.sel').length === 0;
    }));
}

function spawnConfetti(){
  const box=$('#confetti'); box.innerHTML='';
  const cols=['#FF2D6B','#7B3DFF','#FFD479','#32D74B','#ffffff'];
  for(let i=0;i<26;i++){ const s=document.createElement('i');
    s.style.left=Math.random()*100+'%'; s.style.background=cols[i%cols.length];
    s.style.borderRadius=i%3===0?'50%':'2px';
    s.style.animationDuration=(1.8+Math.random()*1.6)+'s'; s.style.animationDelay=(Math.random()*.6)+'s';
    box.appendChild(s); }
}

let fbThen=null;
function hypePct(f){ return f.hype!=null ? f.hype : Math.round((f.rating/5)*100); }
function showFeedback({pct,action='like',gain=0,then=null}){
  $('#fbPct').textContent=pct+'%';
  $('#fbSub').textContent="Tout le monde est d'accord avec ce choix !";
  const bar=$('#fbBar'); bar.style.transition='none'; bar.style.width='0%';
  if(gain>0) showToast('+'+gain+' pts');
  fbThen=then; show('#ovFeedback');
  requestAnimationFrame(()=>requestAnimationFrame(()=>{ bar.style.transition='width 1.1s cubic-bezier(.2,.85,.25,1)'; bar.style.width=pct+'%'; }));
}
$('#fbNext').addEventListener('click', () => { hide('#ovFeedback'); if(fbThen)setTimeout(fbThen,160); });

$('#activityInfo').addEventListener('click',()=>show('#ovActivityInfo'));
$('#levelInfoBtn').addEventListener('click',()=>show('#ovLevels'));
$('#btnPointsInfo').addEventListener('click',()=>show('#ovPointsInfo'));
$('#btnAvis').addEventListener('click',()=>show('#ovQcm'));

$('#qcmSend').addEventListener('click',()=>{
  hide('#ovQcm'); const gain=addPoints(5);
  if(state.justCapped){ state.justCapped=false; showToast('Merci ! 🌙 Quota du jour atteint'); }
  else showToast('Merci ! +'+gain+' pts');
});
$$('.qcm-opt:not(.friend-btn)').forEach(o=>o.addEventListener('click',()=>o.classList.toggle('sel')));

function updateWatchUI(){
  $('#watchCount').textContent='('+state.watch.size+')';
  const strip=$('#watchStrip'); strip.innerHTML='';
  if(state.watch.size===0){ strip.innerHTML='<p class="strip-empty">Aucun film pour l\'instant. Like des films pour les retrouver ici.</p>'; }
  else [...state.watch].forEach(title=>{ 
    const f=getFilmByTitle(title); if(!f)return;
    const c=document.createElement('div'); c.className='s-card';
    c.innerHTML=`<div class="s-poster" style="background:url('${f.poster}') center/cover no-repeat" onclick="openSheetByTitle('${f.title.replace(/'/g, "\\'")}')"></div><p>${f.title}</p>`; strip.appendChild(c); 
  });
  renderSorties(); 
}
function updateSeenUI(){
  $('#seenCount').textContent='('+state.seen.size+')';
  const strip=$('#seenStrip'); strip.innerHTML='';
  if(state.seen.size===0){ strip.innerHTML='<p class="strip-empty">Aucun film noté. Appuie sur 👀 Vu sur un film déjà au ciné.</p>'; }
  else [...state.seen.entries()].forEach(([title,r])=>{ 
    const f=getFilmByTitle(title); if(!f)return;
    const c=document.createElement('div'); c.className='s-card';
    c.innerHTML=`<div class="s-poster" style="background:url('${f.poster}') center/cover no-repeat" onclick="openSheetByTitle('${f.title.replace(/'/g, "\\'")}')"><span class="s-badge">★ ${r}/5</span></div><p>${f.title}</p>`; strip.appendChild(c); 
  });
  renderSorties(); 
}

function openGrid(which){
  $('#gridTitle').textContent = which==='watch' ? '🎬 Mes envies' : '🍿 Mes films vus';
  const body=$('#gridBody'); body.innerHTML='';
  const entries = which==='watch' ? [...state.watch].map(t=>({t,r:null})) : [...state.seen.entries()].map(([t,r])=>({t,r}));
  if(entries.length===0){ body.innerHTML='<p class="strip-empty" style="grid-column:1/-1;padding:8px 2px">Rien ici pour l\'instant.</p>'; }
  else entries.forEach(({t,r})=>{
    const f=getFilmByTitle(t); if(!f)return;
    const c=document.createElement('div');
    c.innerHTML=`<div class="g-poster" style="background:url('${f.poster}') center/cover no-repeat" onclick="openSheetByTitle('${f.title.replace(/'/g, "\\'")}')">${r?`<span class="g-badge">★ ${r}/5</span>`:''}</div><p class="g-title">${f.title}</p>`;
    body.appendChild(c);
  });
  show('#ovGrid');
}
$$('[data-grid]').forEach(b=>b.addEventListener('click',()=>openGrid(b.dataset.grid)));

/* ===================== LE VRAI CLASSEMENT EN TEMPS REEL ===================== */
async function renderBoard(which){
  const list = $('#lbList');
  list.innerHTML = '<div style="text-align:center; padding:20px; color:var(--txt2);">Recherche du classement... ⏳</div>';
  
  const currentUser = auth.currentUser;
  if(!currentUser) return;

  let players = [];
  try {
      if(which === 'friends') {
          const myDoc = await db.collection('users').doc(currentUser.uid).get();
          const myData = myDoc.data();
          players.push({ id: currentUser.uid, name: myData.pseudo || 'Moi', pts: myData.points || 0, me: true });
          
          if(myData.friends && myData.friends.length > 0) {
              const friendDocs = await Promise.all(myData.friends.map(id => db.collection('users').doc(id).get()));
              friendDocs.forEach(doc => {
                  if(doc.exists) {
                      const d = doc.data();
                      players.push({ id: doc.id, name: d.pseudo || d.email.split('@')[0], pts: d.points || 0, me: false });
                  }
              });
          }
      } else {
          const snap = await db.collection('users').orderBy('points', 'desc').limit(25).get();
          snap.forEach(doc => {
              const d = doc.data();
              players.push({ id: doc.id, name: d.pseudo || d.email.split('@')[0], pts: d.points || 0, me: (doc.id === currentUser.uid) });
          });
      }
      
      players.sort((a,b) => b.pts - a.pts);
      
      list.innerHTML='';
      players.forEach((r,n)=>{
        const rank = n + 1;
        const row = document.createElement('div'); 
        row.className = 'lb-row' + (r.me ? ' me' : '');
        row.style.animationDelay = (n * 40) + 'ms';
        
        const rankHtml = (which === 'friends' && rank <= 3) ? `<span class="medal">${['🥇','🥈','🥉'][rank-1]}</span>` : `${grp(rank)}<em>e</em>`;
        const av = r.me ? 'Moi' : r.name[0].toUpperCase();
        
        row.innerHTML = `<span class="lb-rank">${rankHtml}</span><span class="lb-av">${av}</span><span class="lb-name">${r.name}</span><span class="lb-pts">${grp(r.pts)}</span>`;
        list.appendChild(row);
      });
  } catch (e) {
      list.innerHTML = '<div style="text-align:center; padding:20px; color:var(--hype);">Impossible de charger le classement.</div>';
      console.error(e);
  }
}

$$('.seg-btn').forEach(b=>b.addEventListener('click',()=>{
  $$('.seg-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active');
  renderBoard(b.dataset.board);
}));

let activeFilter='hot';
let currentOptTitle = null;

function showScreen(name){
  $$('.screen').forEach(s=>s.classList.remove('active'));
  $('#screen-'+name).classList.add('active');
  $$('.tab').forEach(t=>t.classList.toggle('active',t.dataset.screen===name));
  
  if(name==='feed' && ytPlayerReady && !isMuted) ytPlayer.unMute();
  if(name!=='feed' && ytPlayerReady) ytPlayer.mute(); 
  
  if(name==='profil') {
      const activeBoard = $('.seg-btn.active').dataset.board || 'friends';
      renderBoard(activeBoard);
  }
}
$$('.tab').forEach(t=>t.addEventListener('click',()=>showScreen(t.dataset.screen)));

function enterCinema(){ const r=app.getBoundingClientRect(); app.style.setProperty('--cine',(r.height/r.width).toFixed(3)); app.classList.add('cinema'); }
function exitCinema(){ app.classList.remove('cinema'); }
$('#cineBtn').addEventListener('click',enterCinema);
$('#cinemaExit').addEventListener('click',exitCinema);

/* --- SORTIES --- */
async function renderSorties(){
  const list=$('#sortiesList'); list.innerHTML='';
  const q=$('#searchInput').value.trim().toLowerCase();
  
  let targetFilms = films;
  
  if (activeFilter === 'hot') {
      if(hotFilmsCache.length === 0) {
          try {
            const res = await fetch(`${TMDB_BASE}/movie/upcoming?api_key=${TMDB_API_KEY}&language=fr-FR&region=FR`);
            const data = await res.json();
            hotFilmsCache = data.results.filter(m => m.poster_path).slice(0, 15).map(m => ({
                title: m.title, genre: m.genre_ids.length ? TMDB_GENRES[m.genre_ids[0]] || "Cinéma" : "Cinéma",
                poster: `${IMG_BASE}${m.poster_path}`, hype: Math.min(98, Math.max(50, Math.round(m.vote_average * 10))), rating: m.vote_average ? (m.vote_average/2).toFixed(1) : 4.0, syn: m.overview
            }));
          } catch (e) { console.error(e); }
      }
      targetFilms = hotFilmsCache;
  } else if (activeFilter !== 'now') {
      targetFilms = films.filter(f => f.week === activeFilter);
  }
  
  if(q) {
      targetFilms = targetFilms.filter(f => f.title.toLowerCase().includes(q));
  }
  
  if (targetFilms.length === 0) {
      list.innerHTML='<p class="strip-empty" style="padding:24px 4px">Aucun film pour cette période.</p>';
      return;
  }
  
  targetFilms.forEach((f)=>{
    let stateText = '✚'; let stateClass = '';
    if(state.seen.has(f.title)){ stateText = '👀 Vu'; stateClass = 'seen'; }
    else if(state.watch.has(f.title)){ stateText = '♥ Envie'; stateClass = 'wish'; }

    const safeTitle = f.title.replace(/'/g, "\\'");
    
    const row=document.createElement('div'); row.className='film-row';
    row.innerHTML=`<div class="fr-poster" style="background:url('${f.poster}') center/cover" onclick="openSheetByTitle('${safeTitle}')"></div>
      <div class="fr-body" onclick="openSheetByTitle('${safeTitle}')">
        <h3>${f.title}</h3><p class="fr-genre">${f.genre}</p>
        <p class="fr-hype">🔥 ${f.hype}% <span>Hype</span> · ⭐ ${f.rating}</p>
      </div>
      <div class="fr-actions">
        <button class="fr-state-btn ${stateClass}" onclick="openFilmOptions('${safeTitle}')">${stateText}</button>
      </div>`;
    list.appendChild(row);
  });
}

function openFilmOptions(title) {
  currentOptTitle = title;
  const isWish = state.watch.has(title);
  const isSeen = state.seen.has(title);
  const list = $('#foList');
  list.innerHTML = `
    <button class="qcm-opt ${isWish?'sel':''}" onclick="handleFilmOption('wish')">♥ ${isWish ? 'Retirer de mes envies' : 'Ajouter à mes envies'}</button>
    <button class="qcm-opt ${isSeen?'sel':''}" onclick="handleFilmOption('seen')">👀 ${isSeen ? 'Retirer des films vus' : 'Marquer comme Vu'}</button>
  `;
  show('#ovFilmOptions');
}

function handleFilmOption(action) {
  hide('#ovFilmOptions');
  if(action === 'wish') { toggleWatch(currentOptTitle); }
  else if(action === 'seen') { 
    if(state.seen.has(currentOptTitle)) { 
        state.seen.delete(currentOptTitle); 
        
        if(auth.currentUser) {
            db.collection('users').doc(auth.currentUser.uid).update({ seen: Object.fromEntries(state.seen) });
        }
        
        updateSeenUI();
    }
    else { openStars(currentOptTitle); }
  }
}

$$('.chip').forEach(c=>c.addEventListener('click',()=>{
  $$('.chip').forEach(x=>x.classList.remove('active')); c.classList.add('active');
  activeFilter=c.dataset.filter; renderSorties();
}));

$('#btnInviteMatch').addEventListener('click', () => {
    hide('#ovMatch');
    $$('.friend-btn').forEach(btn => btn.classList.remove('sel'));
    $('#btnSendInvites').disabled = true;
    show('#ovMatchFriends');
});

$$('.friend-btn').forEach(b => b.addEventListener('click', () => {
    b.classList.toggle('sel');
    $('#btnSendInvites').disabled = $$('.friend-btn.sel').length === 0;
}));

$('#btnSendInvites').addEventListener('click', () => {
    hide('#ovMatchFriends');
    showToast(`Invitation envoyée !`);
});

$('#searchInput').addEventListener('input', renderSorties);