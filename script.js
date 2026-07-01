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

/* ===================== VARIABLES ET DONNÉES LOCALES ===================== */
const TMDB_API_KEY = '8e207f9a855beae327c1d41c88c27219';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p/w780';
let films = [], deck = [];
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);

const TMDB_GENRES = { 28: "Action", 12: "Aventure", 16: "Animation", 35: "Comédie", 80: "Crime", 99: "Docu", 18: "Drame", 10751: "Famille", 14: "Fantastique", 36: "Histoire", 27: "Horreur", 10402: "Musique", 9648: "Mystère", 10749: "Romance", 878: "SF", 10770: "Téléfilm", 53: "Thriller", 10752: "Guerre", 37: "Western", 10759: "Action/Aventure", 10765: "Sci-Fi/Fantastique" };

const DAILY_ACTION_CAP = 40;
const state={
  deckIdx:0, filmIdx:0, points:0, xp:0, actionsToday:0, capped:false, justCapped:false,
  watch:new Set(), seen:new Map(), seenTitle:null, seenRating:0, level:1, streak:0, lastActionDate:null,
  currentTrailerWatchedEnough: false, currentPerson: null
};
const app=$('#app'), feed=$('#screen-feed'), card=$('#feedCard'), ring=$('#ringProg'), likeWrap=$('#likeWrap');

/* ===================== BASES DE DONNÉES KLAP ===================== */
const QUIZ_LIST = [
    { easy: { q: "Quel acteur incarne Iron Man dans l'univers Marvel ?", opts: ["Robert Downey Jr.", "Chris Evans", "Tom Holland", "Chris Hemsworth"], a: 0 }, hard: { q: "Quel film a remporté l'Oscar du Meilleur Film en 2020 ?", opts: ["Parasite", "Joker", "1917", "Green Book"], a: 0 } },
    { easy: { q: "Quelle est la couleur de la pilule que Neo avale dans Matrix ?", opts: ["Rouge", "Bleue", "Verte", "Jaune"], a: 0 }, hard: { q: "Quel est le vrai nom de Dark Vador ?", opts: ["Anakin Skywalker", "Luke Skywalker", "Ben Solo", "Kylo Ren"], a: 0 } },
    { easy: { q: "Dans quel film trouve-t-on le personnage de Jack Dawson ?", opts: ["Titanic", "Inception", "Avatar", "Gatsby"], a: 0 }, hard: { q: "Qui a réalisé le film 'Pulp Fiction' en 1994 ?", opts: ["Quentin Tarantino", "Martin Scorsese", "Steven Spielberg", "David Fincher"], a: 0 } },
    { easy: { q: "Quel animal est Simba dans Le Roi Lion ?", opts: ["Un lion", "Un tigre", "Un guépard", "Un léopard"], a: 0 }, hard: { q: "Dans Blade Runner, comment appelle-t-on les androïdes ?", opts: ["Les Réplicants", "Les Synthétiques", "Les Cyborgs", "Les Clones"], a: 0 } },
    { easy: { q: "Quel film de SF culte se déroule sur la planète Arrakis ?", opts: ["Dune", "Star Wars", "Blade Runner", "Avatar"], a: 0 }, hard: { q: "Qui a composé la célèbre musique de 'Interstellar' ?", opts: ["Hans Zimmer", "John Williams", "Ennio Morricone", "Michael Giacchino"], a: 0 } }
];

const SURVEY_LIST = [
    { q: "À quelle fréquence vas-tu au cinéma ?", opts: ["Rarement", "1 fois/mois", "2 à 3 fois/mois", "Toutes les semaines"] },
    { q: "Quel format d'écran préfères-tu pour un blockbuster ?", opts: ["IMAX", "Dolby Cinema", "4DX / ICE", "Standard"] },
    { q: "Préfères-tu voir un film en VF ou en VOSTFR ?", opts: ["Toujours en VF", "Toujours en VO", "Ça dépend du film", "Peu importe"] },
    { q: "Avec qui vas-tu le plus souvent au cinéma ?", opts: ["En couple", "Entre potes", "En famille", "En solo"] },
    { q: "Quel est ton genre de prédilection au cinéma ?", opts: ["Action / SF", "Comédie", "Horreur / Thriller", "Drame / Indé"] }
];

const PERSON_LIST = [
    { name: "Christopher Nolan", img: "url('https://image.tmdb.org/t/p/w780/xuAIuYSs4d8kS8NfO3uIfK2eA31.jpg')" },
    { name: "Zendaya", img: "url('https://image.tmdb.org/t/p/w780/1GAAHh5zGgAIjtgXsjZ4GQ6K26F.jpg')" },
    { name: "Timothée Chalamet", img: "url('https://image.tmdb.org/t/p/w780/BE2sdjpgsa2rNTFa66f7upkaOP.jpg')" },
    { name: "Denis Villeneuve", img: "url('https://image.tmdb.org/t/p/w780/k0A4Hk6qVIf8sI4G2x4uUvU5gC.jpg')" }
];

const DUEL_LIST = [
    { a: { name: "Interstellar", g: "url('https://image.tmdb.org/t/p/w780/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg')"}, b: { name: "Inception", g: "url('https://image.tmdb.org/t/p/w780/8Z8dptJW9WKZ8QloipL15PNDZ4u.jpg')"} },
    { a: { name: "Dune", g: "url('https://image.tmdb.org/t/p/w780/d5NXSklXo0qyIYkgV94XAgMIckC.jpg')"}, b: { name: "Star Wars", g: "url('https://image.tmdb.org/t/p/w780/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg')"} },
    { a: { name: "Barbie", g: "url('https://image.tmdb.org/t/p/w780/cgYg04miVQUAG2FKk3amSnnHzOp.jpg')"}, b: { name: "Oppenheimer", g: "url('https://image.tmdb.org/t/p/w780/ncKCQVXglZXeCGtqGGk278RkE.jpg')"} },
    { a: { name: "Le Seigneur des Anneaux", g: "url('https://image.tmdb.org/t/p/w780/jS0rP6N0Y92Q0zRpe0f0J8l9D.jpg')"}, b: { name: "Harry Potter", g: "url('https://image.tmdb.org/t/p/w780/gY1t1TOfSko22lA2B3v5JbT0AIn.jpg')"} }
];

function show(id){ const el = $(id); if(el) el.classList.add('show'); }
function hide(id){ const el = $(id); if(el) el.classList.remove('show'); }
let toastT=null;
function showToast(t){ const el=$('#toast'); $('#toastTxt').textContent=t; el.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>el.classList.remove('show'),1900); }

/* ===================== LOGIQUE D'AUTHENTIFICATION ===================== */
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

$('#btnForgotPass').addEventListener('click', async () => {
    const loginId = $('#authEmail').value.trim();
    const errorMsg = $('#authError'); errorMsg.textContent = '';
    if(!loginId) { errorMsg.style.color = "#FF2D6B"; errorMsg.textContent = 'Renseigne ton e-mail ou pseudo ci-dessus.'; return; }
    let emailToUse = loginId;
    if(!loginId.includes('@')) {
        try {
            const snap = await db.collection('users').where('pseudo', '==', loginId.toLowerCase()).get();
            if(snap.empty) { errorMsg.textContent = "Pseudo introuvable."; return; }
            emailToUse = snap.docs[0].data().email;
        } catch(e) { errorMsg.textContent = "Erreur serveur."; return; }
    }
    auth.sendPasswordResetEmail(emailToUse).then(() => {
        showToast("E-mail envoyé !"); errorMsg.style.color = "var(--mint)"; errorMsg.textContent = "Vérifie tes spams.";
    }).catch(err => { errorMsg.style.color = "#FF2D6B"; errorMsg.textContent = "Erreur : " + err.message; });
});

$('#authMainBtn').addEventListener('click', async () => {
    const loginId = $('#authEmail').value.trim(); const pass = $('#authPass').value.trim(); const pseudo = $('#authPseudo').value.trim().toLowerCase();
    const errorMsg = $('#authError'); errorMsg.style.color = "#FF2D6B"; errorMsg.textContent = '';
    
    if (isLoginMode) {
        if(!loginId || !pass) { errorMsg.textContent = 'Remplis tous les champs.'; return; }
        let emailToUse = loginId;
        if(!loginId.includes('@')) {
            try {
                const snap = await db.collection('users').where('pseudo', '==', loginId.toLowerCase()).get();
                if(snap.empty) { errorMsg.textContent = "Pseudo introuvable."; return; }
                emailToUse = snap.docs[0].data().email;
            } catch(e) { errorMsg.textContent = "Erreur réseau."; return; }
        }
        auth.signInWithEmailAndPassword(emailToUse, pass).catch(err => { errorMsg.textContent = 'Identifiants incorrects.'; });
    } else {
        if(!loginId || !pass || !pseudo) { errorMsg.textContent = 'Remplis tous les champs.'; return; }
        if(!loginId.includes('@')) { errorMsg.textContent = 'E-mail invalide.'; return; }
        if(pseudo.length < 3 || pseudo.includes(' ')) { errorMsg.textContent = 'Pseudo : 3 car. min, sans espace.'; return; }
        
        try {
            const pseudoCheck = await db.collection('users').where('pseudo', '==', pseudo).get();
            if(!pseudoCheck.empty) { errorMsg.textContent = "Aïe, ce pseudo est déjà pris !"; return; }
            const userCred = await auth.createUserWithEmailAndPassword(loginId, pass);
            await db.collection('users').doc(userCred.user.uid).set({
                email: userCred.user.email, pseudo: pseudo, points: 0, xp: 0, level: 1, actionsToday: 0, streak: 0, lastActionDate: null, friends: [], watch: [], seen: {}
            });
        } catch(err) {
            if(err.code === 'auth/weak-password') errorMsg.textContent = 'Mot de passe trop court (6 car. min).';
            else if(err.code === 'auth/email-already-in-use') errorMsg.textContent = 'Cet e-mail est déjà utilisé.';
            else errorMsg.textContent = 'Erreur : ' + err.message;
        }
    }
});

auth.onAuthStateChanged(user => {
    if(user) {
        hide('#ovAuth');
        db.collection('users').doc(user.uid).onSnapshot(doc => {
            if(doc.exists) {
                const data = doc.data();
                state.points = data.points || 0; state.xp = data.xp || 0; state.level = data.level || 1;
                state.actionsToday = data.actionsToday || 0; state.streak = data.streak || 0; state.lastActionDate = data.lastActionDate || null;
                state.watch = new Set(data.watch || []); state.seen = new Map(Object.entries(data.seen || {}));
                
                updateWatchUI(); updateSeenUI();
                $$('[data-pts]').forEach(el => el.textContent = state.points);
                const lvlTexts = {1:'Spectateur', 2:'Figurant', 3:'Caméo', 4:'2nd Rôle', 5:"Tête d'Affiche", 6:'Star', 7:'Réalisateur', 8:'Légende', 9:'Mythe'};
                if($('.p-status span')) $('.p-status span').textContent = `⭐ Niveau : ${lvlTexts[state.level] || 'Spectateur'}`;
                if($('.p-id h1')) $('.p-id h1').textContent = data.pseudo ? `@${data.pseudo}` : 'Mon Profil';
                $('#uiStreak').textContent = state.streak;
                
                updateEnergyUI(); syncLevelUI();
                if($('#screen-profil').classList.contains('active')) renderBoard('friends');
            }
            if(!appInitialized) { show('#ovTuto'); initTMDB(); appInitialized = true; }
        });

        db.collection('users').doc(user.uid).collection('notifications').orderBy('timestamp', 'desc').onSnapshot(snapshot => {
            const count = $('#notifCount'); const previewText = $('#notifPreviewText'); const fullList = $('#fullNotifList');
            if(!count || !fullList) return;
            count.textContent = snapshot.size; fullList.innerHTML = '';
            
            if(snapshot.empty) {
                previewText.textContent = "Tu es à jour !";
                fullList.innerHTML = '<p class="p-note" style="text-align:center;">Aucune notification pour le moment.</p>';
            } else {
                let isFirst = true;
                snapshot.forEach(doc => {
                    const n = doc.data(); const nId = doc.id;
                    if(isFirst) { previewText.textContent = `Dernière : ${n.title || 'Nouvelle alerte'}`; isFirst = false; }
                    
                    const item = document.createElement('div');
                    item.style.cssText = "background:rgba(255,255,255,0.05); padding:16px; border-radius:16px; font-size:14px; display:flex; align-items:flex-start; gap:12px; border-left:3px solid var(--hype);";
                    let extraHtml = '';
                    if(n.type === 'friend_request') {
                        extraHtml = `<div style="display:flex; gap:8px; margin-top:10px;">
                            <button class="btn-primary" style="padding:8px 12px; font-size:13px; background:var(--mint);" onclick="acceptFriend('${nId}', '${n.fromId}')">Accepter</button>
                            <button class="btn-primary" style="padding:8px 12px; font-size:13px; background:var(--velvet2); border:1px solid var(--line);" onclick="refuseFriend('${nId}')">Refuser</button>
                        </div>`;
                    }
                    item.innerHTML = `<div style="font-size:20px;">${n.icon || '💬'}</div><div style="flex:1"><b style="color:#fff; font-size:15px;">${n.title}</b><br><span style="font-size:13px; color:rgba(255,255,255,0.7); line-height:1.4; display:block; margin-top:4px;">${n.text}</span>${extraHtml}</div>`;
                    fullList.appendChild(item);
                });
            }
        });
    } else { show('#ovAuth'); }
});

function syncLevelUI() {
    $$('.lvl-item').forEach((el, idx) => {
        el.classList.remove('done', 'current');
        if (idx + 1 < state.level) el.classList.add('done');
        else if (idx + 1 === state.level) el.classList.add('current');
    });
}

window.acceptFriend = async function(notifId, fromId) {
    const uid = auth.currentUser.uid;
    await db.collection('users').doc(uid).update({ friends: firebase.firestore.FieldValue.arrayUnion(fromId) });
    await db.collection('users').doc(fromId).update({ friends: firebase.firestore.FieldValue.arrayUnion(uid) });
    await db.collection('users').doc(uid).collection('notifications').doc(notifId).delete();
    showToast("Ami ajouté avec succès !");
};
window.refuseFriend = async function(notifId) { await db.collection('users').doc(auth.currentUser.uid).collection('notifications').doc(notifId).delete(); };

$('#btnHistory').addEventListener('click', () => { show('#ovHistory'); });
$('#btnInvite').addEventListener('click', () => { $('#searchFriendEmail').value = ''; $('#friendSearchResult').innerHTML = ''; show('#ovAddFriend'); });

$('#btnSearchFriend').addEventListener('click', async () => {
    const searchTerm = $('#searchFriendEmail').value.trim().toLowerCase();
    const resEl = $('#friendSearchResult');
    if(!searchTerm) return; const currentUser = auth.currentUser; if(!currentUser) return;

    resEl.innerHTML = "<span style='color:var(--txt2)'>Recherche... 🔎</span>";
    try {
        let snapshot = await db.collection('users').where('pseudo', '==', searchTerm).get();
        if(snapshot.empty) { resEl.innerHTML = "<span style='color:var(--txt3)'>Aucun compte trouvé.</span>"; return; }
        
        const friendDoc = snapshot.docs[0]; const friendId = friendDoc.id; const fData = friendDoc.data();
        if(friendId === currentUser.uid) { resEl.innerHTML = "<span style='color:var(--txt2)'>C'est toi !</span>"; return; }
        
        const myDoc = await db.collection('users').doc(currentUser.uid).get();
        if ((myDoc.data().friends || []).includes(friendId)) { resEl.innerHTML = `<span style='color:var(--txt2)'>@${fData.pseudo} est déjà ton ami.</span>`; return; }

        resEl.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; background:var(--velvet2); padding:12px; border-radius:12px; border:1px solid var(--line);">
            <div><b style="color:#fff; font-size:16px;">@${fData.pseudo}</b><br><span style="font-size:12px; color:var(--gold);">Niveau ${fData.level||1} · ${fData.points||0} pts</span></div>
            <button class="btn-primary" style="padding:8px 14px; width:auto; font-size:13px;" onclick="sendFriendRequest('${friendId}', '${fData.pseudo}')">Demander</button>
        </div>`;
    } catch(error) { resEl.innerHTML = "<span style='color:var(--hype)'>Erreur.</span>"; }
});

window.sendFriendRequest = async function(targetId, targetPseudo) {
    const currentUser = auth.currentUser;
    const myDoc = await db.collection('users').doc(currentUser.uid).get();
    await db.collection('users').doc(targetId).collection('notifications').add({
        type: "friend_request", fromId: currentUser.uid, icon: "👋",
        title: "Demande d'ami", text: `@${myDoc.data().pseudo} souhaite t'ajouter à son réseau !`, timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    $('#friendSearchResult').innerHTML = `<span style='color:var(--mint)'>Demande envoyée à @${targetPseudo} !</span>`;
};

/* ===================== LECTEUR YOUTUBE & BOUTON MUTE ===================== */
let ytPlayerReady = false; let ytPlayer; let isMuted = true;

window.onYouTubeIframeAPIReady = function() {
    ytPlayer = new YT.Player('ytPlayer', {
        height: '100%', width: '100%',
        playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, rel: 0, showinfo: 0, mute: 1, playsinline: 1, loop: 1 },
        events: {
            onReady: () => { ytPlayerReady = true; if(films.length > 0 && (feed.dataset.mode === 'trailer' || feed.dataset.mode === 'poster')) renderSwipeCard(state.filmIdx); },
            onStateChange: (event) => { 
                if (event.data === YT.PlayerState.PLAYING) { $('#fcVideoContainer').style.opacity = 1; $('#fcPosterClear').style.opacity = 0; }
                if (event.data === YT.PlayerState.ENDED) { ytPlayer.seekTo(0); ytPlayer.playVideo(); } 
            }
        }
    });
};

$('#btnMute').addEventListener('click', (e) => {
    e.stopPropagation();
    if(!ytPlayerReady || !ytPlayer) return;
    isMuted = !isMuted;
    if(isMuted) { ytPlayer.mute(); $('#btnMute').textContent = '🔇'; } 
    else { ytPlayer.unMute(); ytPlayer.setVolume(100); $('#btnMute').textContent = '🔊'; }
});

$$('[data-tuto-close]').forEach(el => el.addEventListener('click', () => {
    hide('#ovTuto');
    isMuted = false;
    $('#btnMute').textContent = '🔊';
    if(ytPlayerReady && ytPlayer && ytPlayer.unMute) {
        ytPlayer.unMute();
        ytPlayer.setVolume(100);
        ytPlayer.playVideo(); 
    }
    restartRing();
}));

/* ===================== INIT TMDB & FIREBASE FILMS ===================== */
const mockWeeks = ["hot", "now", "this", "next", "avenir"];

async function initTMDB() {
  try {
    const filmsSnap = await db.collection('films').get();
    const fbFilms = {};
    filmsSnap.forEach(doc => { fbFilms[doc.id] = doc.data(); });

    const res = await fetch(`${TMDB_BASE}/trending/all/week?api_key=${TMDB_API_KEY}&language=fr-FR&region=FR`);
    const data = await res.json();
    
    const detailedFilms = await Promise.all(data.results.slice(0, 20).map(async (m, idx) => {
        if (m.media_type !== 'movie' && m.media_type !== 'tv') return null;
        const dRes = await fetch(`${TMDB_BASE}/${m.media_type}/${m.id}?api_key=${TMDB_API_KEY}&append_to_response=videos,credits,watch/providers&language=fr-FR`);
        const d = await dRes.json();
        
        const vids = d.videos?.results || [];
        let trailer = vids.find(v => v.type === 'Trailer' && v.site === 'YouTube' && v.iso_639_1 === 'fr') || vids.find(v => v.type === 'Trailer' && v.site === 'YouTube') || vids.find(v => v.site === 'YouTube');
        
        let director = "Réalisateur inconnu";
        if (m.media_type === 'movie' && d.credits?.crew) { const dir = d.credits.crew.find(c => c.job === 'Director'); if (dir) director = dir.name; }
        else if (m.media_type === 'tv' && d.created_by?.length) { director = d.created_by[0].name; }

        const castReal = d.credits?.cast?.slice(0, 2).map(c => c.name).join(' · ') || "Casting à découvrir";
        const title = m.title || m.name;
        const relDate = m.release_date || m.first_air_date;
        const isReleased = relDate ? (new Date(relDate) <= new Date()) : true;
        
        const provObj = d['watch/providers']?.results?.FR;
        const prov = provObj?.flatrate?.[0]?.provider_name || provObj?.rent?.[0]?.provider_name;
        const platform = prov ? `sur ${prov}` : 'au Cinéma';
        
        const dispoDate = relDate ? new Date(relDate).toLocaleDateString('fr-FR', {day: 'numeric', month: 'short'}) : '';
        const dispo = isReleased ? 'Actuellement' : `Dès le ${dispoDate}`;
        const typeStr = m.media_type === 'tv' ? 'Série' : 'Film';
        const durationReal = m.media_type === 'movie' && d.runtime ? Math.floor(d.runtime/60) + "h" + (d.runtime%60).toString().padStart(2, '0') : (d.number_of_seasons ? `${d.number_of_seasons} Saison${d.number_of_seasons>1?'s':''}` : 'N/C');
        
        const fbData = fbFilms[m.id.toString()] || { likes: 0, dislikes: 0, sumRating: 0, countRating: 0 };
        const totalSwipes = (fbData.likes || 0) + (fbData.dislikes || 0);
        
        const hypeStr = totalSwipes < 10 ? '-' : Math.round(((fbData.likes || 0) / totalSwipes) * 100);
        const ratingStr = (fbData.countRating || 0) < 1 ? '-' : `${((fbData.sumRating || 0) / fbData.countRating).toFixed(1)} (${fbData.countRating})`;

        const fakeWeek = mockWeeks[idx % mockWeeks.length];
        const metaLine = `<b class="highlight">${typeStr} · ${dispo} ${platform}</b> <span style="color:rgba(255,255,255,0.3); margin:0 4px;">•</span> <b class="white">${durationReal}</b>`;

        return {
            id: m.id, type: m.media_type, title, genre: m.genre_ids?.length ? (TMDB_GENRES[m.genre_ids[0]] || "Cinéma") : "Cinéma", 
            metaLine: metaLine, subSheet: `${typeStr} · ${platform} · ${durationReal}`,
            hype: hypeStr, rating: ratingStr, poster: m.poster_path ? `${IMG_BASE}${m.poster_path}` : null,
            cast: castReal, director: director, syn: m.overview || "Découvrez ce titre incontournable.", ytKey: trailer ? trailer.key : null, week: fakeWeek
        };
    }));

    // CORRECTION DU FILTRE POUR NE PAS EXCLURE LES FILMS SANS TRAILER
    const seenKeys = new Set();
    films = detailedFilms.filter(f => {
        if (!f || !f.poster) return false;
        if (f.ytKey) {
            if (seenKeys.has(f.ytKey)) return false; 
            seenKeys.add(f.ytKey);
        }
        return true;
    });

    if(films.length === 0) { showToast("Vérifie ta connexion internet"); return; }

    deck = []; let baCount = 0;
    films.forEach((f, i) => {
        if (i % 4 === 3) { deck.push({ kind: "poster", film: i }); } 
        else {
            deck.push({ kind: "trailer", film: i }); baCount++;
            if (baCount % 2 === 0) {
                const cycle = (baCount / 2) % 4; 
                if (cycle === 1) {
                    const randomSurvey = SURVEY_LIST[Math.floor(Math.random() * SURVEY_LIST.length)];
                    deck.push({ kind: "survey", q: randomSurvey });
                } else if (cycle === 2) {
                    const randomQuiz = QUIZ_LIST[Math.floor(Math.random() * QUIZ_LIST.length)];
                    deck.push({ kind: "quiz", q: randomQuiz });
                } else if (cycle === 3) {
                    const randomPerson = PERSON_LIST[Math.floor(Math.random() * PERSON_LIST.length)];
                    deck.push({ kind: "person", name: randomPerson.name, img: randomPerson.img });
                } else {
                    const randomDuel = DUEL_LIST[Math.floor(Math.random() * DUEL_LIST.length)];
                    deck.push({ kind: "ab", duel: randomDuel });
                }
            }
        }
    });
    
    renderCard(0); renderSorties();
  } catch (error) { console.error("Erreur TMDB", error); showToast("Erreur de chargement des films"); }
}

function currentFilm(){ return films[state.filmIdx]; }
function grp(n){ return (''+n).replace(/\B(?=(\d{3})+(?!\d))/g,' '); }
function animateValue(el,a,b,dur){
  const t0=performance.now();
  (function step(t){ const k=Math.min(1,(t-t0)/dur); el.textContent=Math.round(a+(b-a)*(1-Math.pow(1-k,3))); if(k<1)requestAnimationFrame(step); })(t0);
}

function updateStreak() {
    const todayStr = new Date().toISOString().split('T')[0];
    if(state.lastActionDate === todayStr) return; 
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if(state.lastActionDate === yesterdayStr) state.streak += 1; else state.streak = 1;
    state.lastActionDate = todayStr; $('#uiStreak').textContent = state.streak;
    if(auth.currentUser) db.collection('users').doc(auth.currentUser.uid).update({ streak: state.streak, lastActionDate: state.lastActionDate });
}

function updateEnergyUI() {
  const current = state.actionsToday; const max = DAILY_ACTION_CAP;
  $('#energyCount').textContent = `${current} / ${max}`; $('#energyBar').style.width = `${Math.min(100, (current/max)*100)}%`;
  $('#energyNote').textContent = current < max ? `Encore ${max-current} action(s) rémunérée(s).` : "Quota atteint 🌙 Swipe juste pour le fun !";
}

function addPoints(baseValue){
  if(baseValue > 0) updateStreak();
  if(state.capped || baseValue === 0) return 0;
  
  state.actionsToday++; updateEnergyUI();
  const mults = {1:1, 2:1.1, 3:1.2, 4:1.3, 5:1.5, 6:1.8, 7:2, 8:2.5, 9:3};
  const gain = Math.round(baseValue * (mults[state.level] || 1)); 
  state.xp += baseValue; state.points += gain;

  if(auth.currentUser) db.collection('users').doc(auth.currentUser.uid).update({ points: state.points, xp: state.xp, actionsToday: state.actionsToday });
  $$('[data-pts]').forEach(el => animateValue(el, parseInt(el.textContent)||0, state.points, 500)); 
  if(state.actionsToday >= DAILY_ACTION_CAP) { state.capped = true; state.justCapped = true; likeWrap.classList.add('capped'); }
  return gain;
}

function getSwipeGain() { return (!state.currentTrailerWatchedEnough) ? 0 : addPoints(5); }
let capPending=null; function openCap(then){ capPending=then; show('#ovCap'); }
$$('[data-cap-close]').forEach(el=>el.addEventListener('click',()=>{ hide('#ovCap'); const t=capPending; capPending=null; if(t)setTimeout(t,160); }));

function restartRing(){ 
    likeWrap.classList.remove('charged'); 
    if(state.capped){ ring.style.animation='none'; return; } 
    ring.style.animation='none'; 
    void ring.offsetWidth; 
    if (feed.dataset.mode === 'trailer') {
        state.currentTrailerWatchedEnough = false;
        ring.style.animation='ring 8s linear forwards';
    } else {
        state.currentTrailerWatchedEnough = true;
        likeWrap.classList.add('charged');
    }
}
ring.addEventListener('animationend',()=>{ if(!state.capped) likeWrap.classList.add('charged'); });
function resetCard(){ card.style.transition='none'; card.style.transform=''; $('#stampLike').style.opacity=0; $('#stampNope').style.opacity=0; }

function renderSwipeCard(filmIndex){
  state.filmIdx=filmIndex; const f=films[filmIndex]; 
  $('#fcBg').style.background = f.poster ? `url('${f.poster}') center/cover no-repeat` : '#16161F';
  $('#fcPosterClear').style.backgroundImage = f.poster ? `url('${f.poster}')` : 'none';
  
  if (deck[state.deckIdx].kind === 'poster' || !f.ytKey) {
      feed.dataset.mode='poster'; 
      $('#fcVideoContainer').style.opacity = 0; 
      $('#fcPosterClear').style.opacity = 1;
      if(ytPlayerReady) ytPlayer.stopVideo();
  } else {
      feed.dataset.mode='trailer'; 
      $('#fcVideoContainer').style.opacity = 0; 
      $('#fcPosterClear').style.opacity = 1;
      if (ytPlayerReady && f.ytKey) {
          ytPlayer.loadVideoById({videoId: f.ytKey});
          if(isMuted) ytPlayer.mute(); else { ytPlayer.unMute(); ytPlayer.setVolume(100); }
          ytPlayer.playVideo();
          setTimeout(() => { if(feed.dataset.mode==='trailer'){ $('#fcVideoContainer').style.opacity = 1; $('#fcPosterClear').style.opacity = 0; }}, 1500);
      } else if (ytPlayerReady) ytPlayer.stopVideo();
  }
  
  $('#fmTitle').textContent=f.title; 
  $('#fmGenre').textContent=f.genre; 
  $('#fmMeta').innerHTML = f.metaLine; 
  restartRing();
}

function renderQuiz(qp){
  feed.dataset.mode='quiz'; if(ytPlayerReady) ytPlayer.stopVideo();
  const hard = state.level>=4; const q = hard ? qp.hard : qp.easy;
  $('#quizTag').textContent = hard ? `🧠 Quiz · Expert` : `🧠 Quiz · Facile`;
  $('#quizQ').textContent=q.q; $('#quizGrid').innerHTML='';
  q.opts.forEach((opt,k)=>{
    const b=document.createElement('button'); b.className='cq-opt'; b.textContent=opt;
    b.addEventListener('click', async () => {
        [...$('#quizGrid').children].forEach(o=>o.style.pointerEvents='none');
        if(k===q.a){ b.classList.add('correct'); const g=addPoints(20); showToast(g>0?'+'+g+' pts':'Quota atteint'); }
        else { b.classList.add('wrong'); $('#quizGrid').children[q.a].classList.add('correct'); showToast('Raté !'); }
        
        try {
            const surveyId = btoa(unescape(encodeURIComponent(q.q))).slice(0,20);
            const ref = db.collection('stats').doc('quiz_'+surveyId);
            await db.runTransaction(async t => {
                const doc = await t.get(ref);
                let counts = doc.exists ? (doc.data().counts || {}) : {};
                q.opts.forEach((_, i) => { if(!counts[i]) counts[i] = 0; });
                counts[k]++;
                t.set(ref, {counts}, {merge:true});
            });
        } catch(e) {}

        setTimeout(nextCard, 1500);
    }, {once:true});
    $('#quizGrid').appendChild(b);
  });
}

function renderSurvey(q) {
  feed.dataset.mode='survey'; if(ytPlayerReady) ytPlayer.stopVideo();
  $('#surveyQ').textContent=q.q; $('#surveyGrid').innerHTML='';
  
  q.opts.forEach((opt, idx)=>{
    const b=document.createElement('button'); b.className='cq-opt'; b.textContent=opt;
    b.addEventListener('click', async () => {
        [...$('#surveyGrid').children].forEach(o=>o.style.pointerEvents='none');
        b.style.background = 'var(--grad)'; b.style.borderColor = 'var(--hype)';
        addPoints(0); showToast('Merci pour ton avis !');
        
        const surveyId = btoa(unescape(encodeURIComponent(q.q))).slice(0,20);
        const ref = db.collection('stats').doc('survey_'+surveyId);
        try {
            const res = await db.runTransaction(async t => {
                const doc = await t.get(ref);
                let counts = doc.exists ? (doc.data().counts || {}) : {};
                q.opts.forEach((_, i) => { if(!counts[i]) counts[i] = 0; });
                counts[idx]++;
                t.set(ref, {counts}, {merge:true});
                return counts;
            });
            const total = Object.values(res).reduce((a,v)=>a+v, 0);
            [...$('#surveyGrid').children].forEach((btn, i) => {
                const pct = Math.round((res[i]/total)*100) || 0;
                btn.innerHTML = `<span style="text-align:left;">${q.opts[i]}</span><span style="color:var(--gold); font-weight:800; font-size:18px;">${pct}%</span>`;
                btn.style.display = 'flex'; btn.style.justifyContent = 'space-between';
            });
            $('#surveyTag').innerHTML = `📊 Sondage <span style="color:var(--txt2); font-weight:normal; margin-left:6px;">(${total} votes)</span>`;
        } catch(e) {}

        setTimeout(nextCard, 3500);
    }, {once:true});
    $('#surveyGrid').appendChild(b);
  });
}

function renderAb(d){
  feed.dataset.mode='ab'; if(ytPlayerReady) ytPlayer.stopVideo();
  $('#abAbg').style.backgroundImage = d.a.g; $('#abAph').style.backgroundImage = d.a.g;
  $('#abBbg').style.backgroundImage = d.b.g; $('#abBph').style.backgroundImage = d.b.g;
  $('#abApct').textContent=""; $('#abBpct').textContent=""; 
  $('#abVsTitle').style.opacity = '1'; $('#abTotalVotes').style.opacity = '0';
  
  const A=$('#abA'), B=$('#abB'); A.className='ab-half'; B.className='ab-half';
  
  const voteAb = async (isA) => {
      A.onclick=null; B.onclick=null;
      if(isA) { A.classList.add('win'); B.classList.add('lose'); }
      else { B.classList.add('win'); A.classList.add('lose'); }
      $('#abVsTitle').style.opacity='0';
      $('#abApct').textContent='...'; $('#abBpct').textContent='...';
      
      const duelId = btoa(unescape(encodeURIComponent(d.a.name))).slice(0,15);
      const ref = db.collection('stats').doc('duel_'+duelId);
      try {
         const res = await db.runTransaction(async t => {
             const doc = await t.get(ref);
             let a=0, b=0;
             if(doc.exists) { a = doc.data().a || 0; b = doc.data().b || 0; }
             if(isA) a++; else b++;
             t.set(ref, {a,b}, {merge:true});
             return {a,b};
         });
         const total = res.a + res.b;
         $('#abApct').textContent = Math.round((res.a/total)*100) + '%';
         $('#abBpct').textContent = Math.round((res.b/total)*100) + '%';
         $('#abTotalVotes').textContent = `${total} vote${total>1?'s':''}`;
         $('#abTotalVotes').style.opacity = '1';
      } catch(e) {
         $('#abApct').textContent = '-'; $('#abBpct').textContent = '-';
      }
      setTimeout(nextCard, 3500);
  };

  A.onclick=()=>voteAb(true); B.onclick=()=>voteAb(false);
}

function renderPerson(d) {
    feed.dataset.mode='person'; if(ytPlayerReady) ytPlayer.stopVideo();
    state.currentPerson = d.name;
    $('#cpPhoto').style.backgroundImage = d.img; $('#cpName').textContent = d.name;
}

async function votePerson(like) { 
    addPoints(10); 
    show('#ovPersonResult'); 
    $('#prLike').textContent = '...'; $('#prDislike').textContent = '...';
    $('#prTotalVotes').textContent = 'Calcul des votes...';

    const personId = btoa(unescape(encodeURIComponent(state.currentPerson))).slice(0,20);
    const personRef = db.collection('stats').doc('person_' + personId);
    try {
        await db.runTransaction(async (t) => {
            const doc = await t.get(personRef);
            let likes = 0, dislikes = 0;
            if(doc.exists) { likes = doc.data().likes || 0; dislikes = doc.data().dislikes || 0; }
            if(like) likes++; else dislikes++;
            t.set(personRef, { likes, dislikes }, { merge: true });

            const total = likes + dislikes;
            const likePct = Math.round((likes / total) * 100);
            
            setTimeout(() => {
                $('#prLike').textContent = likePct + '%';
                $('#prDislike').textContent = (100 - likePct) + '%';
                $('#prTotalVotes').textContent = `${total} vote${total > 1 ? 's' : ''}`;
            }, 100);
        });
    } catch(e) {
        $('#prTotalVotes').textContent = 'Erreur réseau';
    }
}
$('#btnPersonNext').addEventListener('click', () => { hide('#ovPersonResult'); nextCard(); });

function renderCard(i){
  if(deck.length === 0) return;
  if(i >= deck.length) {
      $('#feedCard').style.display = 'none';
      $('#cardQuiz').style.display = 'none'; 
      $('#cardSurvey').style.display = 'none'; 
      $('#cardAb').style.display = 'none'; 
      $('#cardPerson').style.display = 'none';
      $('.feed-ui').style.display = 'none';
      $('#endOfDeck').style.display = 'flex';
      if (ytPlayerReady) ytPlayer.stopVideo();
      return;
  }
  
  state.deckIdx = i; const c = deck[state.deckIdx]; resetCard();
  
  // 1. On force le masquage de toutes les cartes spéciales via JS
  $('#cardQuiz').style.display = 'none';
  $('#cardSurvey').style.display = 'none';
  $('#cardAb').style.display = 'none';
  $('#cardPerson').style.display = 'none';

  // 2. On affiche uniquement la carte demandée
  if(c.kind==='trailer' || c.kind==='poster') {
      renderSwipeCard(c.film);
  } else if(c.kind==='quiz') { 
      $('#cardQuiz').style.display = 'flex'; 
      renderQuiz(c.q); 
  } else if(c.kind==='survey') { 
      $('#cardSurvey').style.display = 'flex'; 
      renderSurvey(c.q); 
  } else if(c.kind==='ab') { 
      $('#cardAb').style.display = 'flex'; 
      renderAb(c.duel); 
  } else if(c.kind==='person') { 
      $('#cardPerson').style.display = 'flex'; 
      renderPerson(c); 
  }
}

function nextCard(){ renderCard(state.deckIdx+1); }

/* ===================== SWIPE & GESTES ===================== */
let dragging=false,startX=0,dx=0;
card.addEventListener('pointerdown',e=>{
  if((feed.dataset.mode!=='trailer' && feed.dataset.mode!=='poster') || app.classList.contains('cinema'))return;
  dragging=true; startX=e.clientX; dx=0; card.style.transition='none'; card.setPointerCapture(e.pointerId);
});
card.addEventListener('pointermove',e=>{
  if(!dragging)return; dx=e.clientX-startX;
  card.style.transform=`translateX(${dx}px) rotate(${dx*0.045}deg)`;
  $('#stampLike').style.opacity=Math.max(0,Math.min(1,dx/90)); $('#stampNope').style.opacity=Math.max(0,Math.min(1,-dx/90));
});
card.addEventListener('pointerup',()=>{
  if(!dragging)return; dragging=false; const T=92;
  if(dx>T) fly('right'); else if(dx<-T) fly('left');
  else { if(Math.abs(dx)<8) openSheet(films[state.filmIdx]); snapBack(); }
});
card.addEventListener('pointercancel',()=>{ dragging=false; snapBack(); });
function snapBack(){ card.style.transition='transform .35s var(--ease)'; card.style.transform=''; $('#stampLike').style.opacity=0; $('#stampNope').style.opacity=0; }

let swipeCount = 0;

async function fetchAndVoteFilm(f, isLike) {
    const ref = db.collection('films').doc(f.id.toString());
    try {
        const res = await db.runTransaction(async (t) => {
            const doc = await t.get(ref);
            let likes = 0, dislikes = 0;
            if(doc.exists) { likes = doc.data().likes || 0; dislikes = doc.data().dislikes || 0; }
            if(isLike) likes++; else dislikes++;
            t.set(ref, { likes, dislikes }, { merge: true });
            return { likes, dislikes };
        });
        const total = res.likes + res.dislikes;
        return total < 10 ? '-' : Math.round((res.likes / total) * 100);
    } catch(e) { return f.hype; } 
}

function fly(side){
  if(feed.dataset.mode!=='trailer' && feed.dataset.mode!=='poster')return;
  if (feed.dataset.mode === 'trailer') state.currentTrailerWatchedEnough = (ytPlayerReady && ytPlayer.getCurrentTime() >= 8);
  else state.currentTrailerWatchedEnough = true;
  
  if(side==='right') addToWatch(films[state.filmIdx].title);
  card.style.transition='transform .3s ease-in'; card.style.transform = side==='right' ? 'translateX(135%) rotate(18deg)' : 'translateX(-135%) rotate(-18deg)';
  $('#stampLike').style.opacity=side==='right'?1:0; $('#stampNope').style.opacity=side==='left'?1:0;
  
  swipeCount++;
  if (swipeCount % 4 === 0) {
      setTimeout(()=>openQualif(side),300);
  } else {
      const gain = getSwipeGain();
      if(side === 'right') {
          const f = currentFilm();
          const pctPromise = fetchAndVoteFilm(f, true);
          showFeedback({ pctPromise, gain, then: nextCard });
      } else {
          fetchAndVoteFilm(currentFilm(), false);
          nextCard();
      }
  }
}

function toggleWatch(title){ 
    if(state.watch.has(title)) state.watch.delete(title); else state.watch.add(title); 
    if(auth.currentUser) db.collection('users').doc(auth.currentUser.uid).update({ watch: Array.from(state.watch) }); updateWatchUI(); 
}
function addToWatch(title){ state.watch.add(title); if(auth.currentUser) db.collection('users').doc(auth.currentUser.uid).update({ watch: Array.from(state.watch) }); updateWatchUI(); }

function openQualif(side){
  getSwipeGain(); 
  if (side === 'right') { show('#ovQualRight'); } else { show('#ovQualLeft'); }
}
$$('#ovQualLeft .qbtn').forEach(b=>b.addEventListener('click',()=>{ 
    hide('#ovQualLeft'); 
    const pctPromise = fetchAndVoteFilm(currentFilm(), false);
    showFeedback({pctPromise, gain: 0, then: nextCard}); 
}));
$$('#ovQualRight .qbtn').forEach(b=>b.addEventListener('click',()=>{ hide('#ovQualRight'); show('#ovAttr'); }));
$$('[data-cancel-qual]').forEach(el=>el.addEventListener('click',()=>{ hide('#ovQualLeft'); hide('#ovQualRight'); snapBack(); }));
$$('[data-attr]').forEach(b=>b.addEventListener('click',afterRightData)); $$('[data-attr-skip]').forEach(el=>el.addEventListener('click',afterRightData));

async function afterRightData(){
  hide('#ovAttr'); const then = nextCard, f = currentFilm(); 
  if(state.justCapped){ state.justCapped=false; openCap(then); return; }
  const pctPromise = fetchAndVoteFilm(f, true);
  showFeedback({pctPromise, gain:0, then});
}

$$('.draggable-sheet').forEach(panel => {
    let sY = 0, cY = 0;
    panel.addEventListener('touchstart', e => { if(panel.scrollTop === 0) sY = e.touches[0].clientY; else sY = 0; }, {passive: true});
    panel.addEventListener('touchmove', e => {
        if(sY === 0 || panel.scrollTop > 0) return;
        const dy = e.touches[0].clientY - sY;
        if(dy > 0) { cY = dy; panel.style.transform = `translateY(${dy}px)`; panel.style.transition = 'none'; }
    }, {passive: true});
    panel.addEventListener('touchend', () => {
        panel.style.transition = ''; panel.style.transform = '';
        if(cY > 100) { const ov = panel.closest('.ov'); if(ov.id==='ovSheet') closeSheet(); else hide('#'+ov.id); }
        cY = 0;
    });
});

function openSheet(f){
  if(!f) return;
  $('#shPoster').style.backgroundImage = f.poster ? `url('${f.poster}')` : 'none'; 
  $('#shTitle').textContent=f.title; $('#shSub').textContent=f.subSheet;
  $('#shCast').innerHTML=`<b>De ${f.director}</b><br>Avec ${f.cast}`; $('#shSyn').textContent=f.syn;
  $('#shHype').textContent = f.hype === '-' ? '-' : f.hype+'%'; $('#shScoreNum').textContent = f.rating; $('#shScoreBlock').style.display='';
  const w=$('#shWish'), isAdded=state.watch.has(f.title);
  w.classList.toggle('added',isAdded); w.textContent=isAdded?'✓ Dans mes envies':'♥ Ajouter à mes envies';
  w.onclick = () => { toggleWatch(f.title); const nA=state.watch.has(f.title); w.classList.toggle('added',nA); w.textContent=nA?'✓ Dans mes envies':'♥ Ajouter à mes envies'; };
  show('#ovSheet'); requestAnimationFrame(()=> { $('#shHypeBar').style.width = f.hype === '-' ? '0%' : f.hype+'%'; });
}
function openSheetByTitle(title) { const f = films.find(x=>x.title===title); if(f) openSheet(f); }
function closeSheet(){ hide('#ovSheet'); $('#shHypeBar').style.width=0; }
$('#filmInfo').addEventListener('click',() => openSheet(films[state.filmIdx]));
$$('[data-close]').forEach(el=>el.addEventListener('click',()=>{ const ov=el.closest('.ov'); if(ov.id==='ovSheet') closeSheet(); else hide('#'+ov.id); }));

$('#btnNope').addEventListener('click',()=>fly('left')); $('#btnLike').addEventListener('click',()=>fly('right'));
$('#btnSeen').addEventListener('click',()=>{ if(feed.dataset.mode!=='trailer' && feed.dataset.mode!=='poster') return; openStars(currentFilm().title); });
const starBtns=$$('#starsRow .star');
function openStars(title){ $('#starsFilm').textContent=`Pour « ${title} »`; state.seenTitle = title; state.seenRating=0; starBtns.forEach(x=>x.classList.remove('on')); $('#starsNext').disabled=true; show('#ovStars'); }

starBtns.forEach(b=>b.addEventListener('click',()=>{ state.seenRating=+b.dataset.v; starBtns.forEach(x=>x.classList.toggle('on',+x.dataset.v<=state.seenRating)); $('#starsNext').disabled=false; }));
$('#starsNext').addEventListener('click',()=>{ 
    if(state.seenRating<1)return; 
    hide('#ovStars'); $$('.qbtn-multi').forEach(b => b.classList.remove('sel'));
    if (state.seenRating < 3) { $('#btnSeenBadValidate').disabled = true; show('#ovSeenBad'); } else { $('#btnSeenGoodValidate').disabled = true; show('#ovSeenGood'); }
});
$$('.qbtn-multi').forEach(b => { b.addEventListener('click', () => { b.classList.toggle('sel'); const parentGrid = b.closest('.grid2'); const validateBtn = parentGrid.nextElementSibling; validateBtn.disabled = parentGrid.querySelectorAll('.sel').length === 0; }); });
$('#btnSeenGoodValidate').addEventListener('click', () => { hide('#ovSeenGood'); finalizeSeen(); });
$('#btnSeenBadValidate').addEventListener('click', () => { hide('#ovSeenBad'); finalizeSeen(); });
$$('[data-close-seen]').forEach(el=>el.addEventListener('click',()=>{ hide('#ovSeenGood'); hide('#ovSeenBad'); }));

async function finalizeSeen(){
  const f = films.find(x => x.title === state.seenTitle);
  state.seen.set(state.seenTitle, state.seenRating);
  if(auth.currentUser) db.collection('users').doc(auth.currentUser.uid).update({ seen: Object.fromEntries(state.seen) });
  updateSeenUI(); const gain=addPoints(10);
  
  if(f) {
      const ref = db.collection('films').doc(f.id.toString());
      try {
          await db.runTransaction(async t => {
              const doc = await t.get(ref);
              let sum = 0, count = 0;
              if(doc.exists) { sum = doc.data().sumRating || 0; count = doc.data().countRating || 0; }
              sum += state.seenRating; count++;
              t.set(ref, {sumRating: sum, countRating: count}, {merge:true});
          });
      } catch(e){}
  }

  if ($('#screen-feed').classList.contains('active')) { 
      const then = nextCard; 
      if(state.justCapped){ state.justCapped=false; openCap(then); } 
      else { showFeedback({pctPromise: Promise.resolve(f ? f.hype : '-'), gain, then}); } 
  } 
  else { if(state.justCapped) { state.justCapped=false; showToast('Film noté ! Quota atteint 🌙'); } else showToast(`+${gain} pts ! Vu.`); }
}

let fbThen=null;
function showFeedback({pctPromise, gain=0, then=null}){
  $('#fbPct').textContent = '...';
  $('#fbSub').textContent = "Calcul des votes en cours...";
  $('#fbBar').style.width = '0%';
  if(gain > 0) showToast('+' + gain + ' pts');
  fbThen = then;
  show('#ovFeedback');

  pctPromise.then(pct => {
      if (pct === '-') {
          $('#fbPct').textContent = '-';
          $('#fbSub').textContent = "Pas assez de votes Klap pour afficher la Hype !";
      } else {
          $('#fbPct').textContent = pct + '%';
          $('#fbSub').textContent = "La commu est d'accord avec ce choix !";
          requestAnimationFrame(()=>requestAnimationFrame(()=>{ 
              $('#fbBar').style.transition='width 1.1s cubic-bezier(.2,.85,.25,1)'; 
              $('#fbBar').style.width=pct+'%'; 
          }));
      }
  });
}

$('#fbNext').addEventListener('click', () => { hide('#ovFeedback'); if(fbThen)setTimeout(fbThen,160); });
$('#activityInfo').addEventListener('click',()=>show('#ovActivityInfo')); $('#levelInfoBtn').addEventListener('click',()=>show('#ovLevels')); $('#btnPointsInfo').addEventListener('click',()=>show('#ovPointsInfo')); $('#btnAvis').addEventListener('click',()=>show('#ovQcm'));
$('#qcmSend').addEventListener('click',()=>{ hide('#ovQcm'); const gain=addPoints(5); showToast('Merci ! +'+gain+' pts'); });
$$('.qcm-opt:not(.friend-btn)').forEach(o=>o.addEventListener('click',()=>o.classList.toggle('sel')));

function updateWatchUI(){
  $('#watchCount').textContent='('+state.watch.size+')'; const strip=$('#watchStrip'); strip.innerHTML='';
  if(state.watch.size===0) strip.innerHTML='<p class="strip-empty">Aucun film pour l\'instant.</p>'; 
  else [...state.watch].forEach(title=>{ const f=films.find(x=>x.title===title); if(!f)return; const c=document.createElement('div'); c.className='s-card'; c.innerHTML=`<div class="s-poster" style="background:url('${f.poster}') center/cover no-repeat" onclick="openSheetByTitle('${f.title.replace(/'/g, "\\'")}')"></div><p>${f.title}</p>`; strip.appendChild(c); });
}
function updateSeenUI(){
  $('#seenCount').textContent='('+state.seen.size+')'; const strip=$('#seenStrip'); strip.innerHTML='';
  if(state.seen.size===0) strip.innerHTML='<p class="strip-empty">Aucun film noté.</p>'; 
  else [...state.seen.entries()].forEach(([title,r])=>{ const f=films.find(x=>x.title===title); if(!f)return; const c=document.createElement('div'); c.className='s-card'; c.innerHTML=`<div class="s-poster" style="background:url('${f.poster}') center/cover no-repeat" onclick="openSheetByTitle('${f.title.replace(/'/g, "\\'")}')"><span class="s-badge">★ ${r}/5</span></div><p>${f.title}</p>`; strip.appendChild(c); });
}

function openGrid(which){
  $('#gridTitle').textContent = which==='watch' ? '🎬 Mes envies' : '🍿 Mes films vus'; const body=$('#gridBody'); body.innerHTML='';
  const entries = which==='watch' ? [...state.watch].map(t=>({t,r:null})) : [...state.seen.entries()].map(([t,r])=>({t,r}));
  if(entries.length===0) body.innerHTML='<p class="strip-empty" style="grid-column:1/-1;padding:8px 2px">Rien ici.</p>'; 
  else entries.forEach(({t,r})=>{ const f=films.find(x=>x.title===t); if(!f)return; const c=document.createElement('div'); c.innerHTML=`<div class="g-poster" style="background-image:url('${f.poster}')" onclick="openSheetByTitle('${f.title.replace(/'/g, "\\'")}')">${r?`<span class="g-badge">★ ${r}/5</span>`:''}</div><p class="g-title">${f.title}</p>`; body.appendChild(c); });
  show('#ovGrid');
}
$$('[data-grid]').forEach(b=>b.addEventListener('click',()=>openGrid(b.dataset.grid)));

async function renderBoard(which){
  const list = $('#lbList'); list.innerHTML = '<div style="text-align:center; padding:20px; color:var(--txt2);">Chargement... ⏳</div>';
  const currentUser = auth.currentUser; if(!currentUser) return; let players = [];
  try {
      if(which === 'friends') {
          const myDoc = await db.collection('users').doc(currentUser.uid).get(); const myData = myDoc.data();
          players.push({ id: currentUser.uid, name: myData.pseudo || 'Moi', pts: myData.points || 0, me: true });
          if(myData.friends?.length) {
              const friendDocs = await Promise.all(myData.friends.map(id => db.collection('users').doc(id).get()));
              friendDocs.forEach(doc => { if(doc.exists) { const d = doc.data(); players.push({ id: doc.id, name: d.pseudo || d.email.split('@')[0], pts: d.points || 0, me: false }); } });
          }
      } else {
          const snap = await db.collection('users').orderBy('points', 'desc').limit(25).get();
          snap.forEach(doc => { const d = doc.data(); players.push({ id: doc.id, name: d.pseudo || d.email.split('@')[0], pts: d.points || 0, me: (doc.id === currentUser.uid) }); });
      }
      players.sort((a,b) => b.pts - a.pts); list.innerHTML='';
      players.forEach((r,n)=>{
        const rank = n + 1; const row = document.createElement('div'); row.className = 'lb-row' + (r.me ? ' me' : ''); row.style.animationDelay = (n * 40) + 'ms';
        const rankHtml = (which === 'friends' && rank <= 3) ? `<span class="medal">${['🥇','🥈','🥉'][rank-1]}</span>` : `${grp(rank)}<em>e</em>`;
        const av = r.me ? 'Moi' : r.name[0].toUpperCase();
        row.innerHTML = `<span class="lb-rank">${rankHtml}</span><span class="lb-av">${av}</span><span class="lb-name">${r.name}</span><span class="lb-pts">${grp(r.pts)}</span>`;
        list.appendChild(row);
      });
  } catch (e) { list.innerHTML = '<div style="color:var(--hype);">Erreur.</div>'; }
}
$$('.seg-btn').forEach(b=>b.addEventListener('click',()=>{ $$('.seg-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); renderBoard(b.dataset.board); }));

let activeFilter='hot';
function showScreen(name){
  $$('.screen').forEach(s=>s.classList.remove('active')); $('#screen-'+name).classList.add('active');
  $$('.tab').forEach(t=>t.classList.toggle('active',t.dataset.screen===name));
  if(name==='feed' && ytPlayerReady && !isMuted) ytPlayer.unMute();
  if(name!=='feed' && ytPlayerReady) ytPlayer.mute(); 
  if(name==='profil') renderBoard($('.seg-btn.active').dataset.board || 'friends');
}
$$('.tab').forEach(t=>t.addEventListener('click',()=>showScreen(t.dataset.screen)));

function enterCinema(){ const r=app.getBoundingClientRect(); app.style.setProperty('--cine',(r.height/r.width).toFixed(3)); app.classList.add('cinema'); }
function exitCinema(){ app.classList.remove('cinema'); }
$('#cineBtn').addEventListener('click',enterCinema); $('#cinemaExit').addEventListener('click',exitCinema);

$('#btnToggleSearch').addEventListener('click', () => { $('#searchBar').classList.toggle('open'); $('#searchInput').focus(); });

async function renderSorties(){
  const list=$('#sortiesList'); list.innerHTML='';
  let targetFilms = films;
  
  if (activeFilter !== 'hot') {
      targetFilms = films.filter(f => f.week === activeFilter);
  }
  
  if (targetFilms.length === 0) { list.innerHTML='<p class="strip-empty" style="padding:24px 4px">Aucun résultat trouvé pour cette période.</p>'; return; }
  
  targetFilms.forEach((f)=>{
    let stateText = '✚'; let stateClass = ''; if(state.seen.has(f.title)){ stateText = '👀 Vu'; stateClass = 'seen'; } else if(state.watch.has(f.title)){ stateText = '♥ Envie'; stateClass = 'wish'; }
    const safeTitle = f.title.replace(/'/g, "\\'");
    const row=document.createElement('div'); row.className='film-row';
    row.innerHTML=`<div class="fr-poster" style="background:url('${f.poster}') center/cover" onclick="openSheetByTitle('${safeTitle}')"></div>
      <div class="fr-body" onclick="openSheetByTitle('${safeTitle}')"><h3>${f.title}</h3><p class="fr-genre">${f.genre}</p><p class="fr-hype">🔥 ${f.hype === '-' ? '-' : f.hype+'%'} <span>Hype</span> · ⭐ ${f.rating}</p></div>
      <div class="fr-actions"><button class="fr-state-btn ${stateClass}" onclick="openFilmOptions('${safeTitle}')">${stateText}</button></div>`;
    list.appendChild(row);
  });
}

let searchTimeout;
$('#searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimeout); const q = e.target.value.trim().toLowerCase();
    if(!q) { renderSorties(); return; }
    searchTimeout = setTimeout(async () => {
        try {
            const res = await fetch(`${TMDB_BASE}/search/multi?api_key=${TMDB_API_KEY}&language=fr-FR&query=${encodeURIComponent(q)}`);
            const data = await res.json();
            const list=$('#sortiesList'); list.innerHTML='';
            const results = data.results.filter(m => (m.media_type==='movie'||m.media_type==='tv') && m.poster_path).slice(0,10);
            if (results.length === 0) { list.innerHTML='<p class="strip-empty" style="padding:24px 4px">Aucun résultat.</p>'; return; }
            
            results.forEach(m => {
                const title = m.title || m.name;
                const safeTitle = title.replace(/'/g, "\\'");
                const poster = `${IMG_BASE}${m.poster_path}`;
                const genre = m.genre_ids?.length ? (TMDB_GENRES[m.genre_ids[0]] || "Cinéma") : "Cinéma";
                let stateText = '✚'; let stateClass = ''; if(state.seen.has(title)){ stateText = '👀 Vu'; stateClass = 'seen'; } else if(state.watch.has(title)){ stateText = '♥ Envie'; stateClass = 'wish'; }
                
                const row=document.createElement('div'); row.className='film-row';
                row.innerHTML=`<div class="fr-poster" style="background:url('${poster}') center/cover" onclick="showToast('Disponible au prochain swipe !')"></div>
                  <div class="fr-body" onclick="showToast('Disponible au prochain swipe !')"><h3>${title}</h3><p class="fr-genre">${genre}</p><p class="fr-hype">🔥 - <span>Hype</span> · ⭐ -</p></div>
                  <div class="fr-actions"><button class="fr-state-btn ${stateClass}" onclick="showToast('Bientôt dispo !')">${stateText}</button></div>`;
                list.appendChild(row);
            });
        } catch(e) {}
    }, 500);
});

$$('.chip').forEach(c=>c.addEventListener('click',()=>{ $$('.chip').forEach(x=>x.classList.remove('active')); c.classList.add('active'); activeFilter=c.dataset.filter; $('#searchInput').value=''; renderSorties(); }));

let currentOptTitle = null;
window.openFilmOptions = function(title) {
  currentOptTitle = title; const isWish = state.watch.has(title); const isSeen = state.seen.has(title);
  $('#foList').innerHTML = `<button class="qcm-opt ${isWish?'sel':''}" onclick="handleFilmOption('wish')">♥ ${isWish ? 'Retirer des envies' : 'Ajouter aux envies'}</button><button class="qcm-opt ${isSeen?'sel':''}" onclick="handleFilmOption('seen')">👀 ${isSeen ? 'Retirer des films vus' : 'Marquer comme Vu'}</button>`; show('#ovFilmOptions');
};
window.handleFilmOption = function(action) {
  hide('#ovFilmOptions');
  if(action === 'wish') toggleWatch(currentOptTitle);
  else if(action === 'seen') { 
    if(state.seen.has(currentOptTitle)) { state.seen.delete(currentOptTitle); if(auth.currentUser) db.collection('users').doc(auth.currentUser.uid).update({ seen: Object.fromEntries(state.seen) }); updateSeenUI(); }
    else openStars(currentOptTitle); 
  }
};
