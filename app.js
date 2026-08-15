import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    getDoc,
    doc,
    setDoc,
    query,
    orderBy,
    where,
    updateDoc,
    arrayUnion,
    arrayRemove,
    serverTimestamp,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


// ===============================
// FIREBASE CONFIG
// ===============================

const firebaseConfig = {

    apiKey: "YOUR_API_KEY",

    authDomain: "YOUR_PROJECT.firebaseapp.com",

    projectId: "YOUR_PROJECT_ID",

    storageBucket: "YOUR_PROJECT.firebasestorage.app",

    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",

    appId: "YOUR_APP_ID"
};


// Initialize Firebase

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


// Current user

let currentUser = null;


// ===============================
// PAGE SYSTEM
// ===============================

window.showPage = function(page) {

    document.getElementById("homePage").style.display = "none";
    document.getElementById("loginPage").style.display = "none";
    document.getElementById("signupPage").style.display = "none";
    document.getElementById("profilePage").style.display = "none";


    if (page === "home") {

        document.getElementById("homePage").style.display = "block";

        loadPosts();

    }

    if (page === "login") {

        document.getElementById("loginPage").style.display = "block";

    }

    if (page === "signup") {

        document.getElementById("signupPage").style.display = "block";

    }

    if (page === "profile") {

        if (!currentUser) {

            showPage("login");

            return;
        }

        document.getElementById("profilePage").style.display = "block";

        loadProfile();

    }
};


// ===============================
// SIGNUP
// ===============================

window.signup = async function() {

    const name =
        document.getElementById("signupName").value.trim();

    const email =
        document.getElementById("signupEmail").value.trim();

    const password =
        document.getElementById("signupPassword").value;


    if (!name || !email || !password) {

        document.getElementById("signupMessage").innerText =
            "Please fill all fields.";

        return;
    }


    try {

        const userCredential =
            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );


        const user = userCredential.user;


        await setDoc(
            doc(db, "users", user.uid),
            {
                name: name,
                email: email,
                createdAt: serverTimestamp()
            }
        );


        alert("Account created successfully.");

        showPage("home");

    }

    catch (error) {

        document.getElementById("signupMessage").innerText =
            error.message;

    }

};


// ===============================
// LOGIN
// ===============================

window.login = async function() {

    const email =
        document.getElementById("loginEmail").value.trim();

    const password =
        document.getElementById("loginPassword").value;


    try {

        await signInWithEmailAndPassword(
            auth,
            email,
            password
        );


        showPage("home");

    }

    catch (error) {

        document.getElementById("loginMessage").innerText =
            error.message;

    }

};


// ===============================
// LOGOUT
// ===============================

window.logout = async function() {

    await signOut(auth);

    showPage("home");

};


// ===============================
// AUTH STATE
// ===============================

onAuthStateChanged(auth, async (user) => {

    currentUser = user;


    if (user) {

        document.getElementById("loginNav").style.display =
            "none";

        document.getElementById("logoutBtn").style.display =
            "inline-block";

        document.getElementById("createBox").style.display =
            "block";

    }

    else {

        document.getElementById("loginNav").style.display =
            "inline-block";

        document.getElementById("logoutBtn").style.display =
            "none";

        document.getElementById("createBox").style.display =
            "none";

    }


    loadPosts();

});


// ===============================
// CREATE POST
// ===============================

window.createPost = async function() {

    if (!currentUser) {

        alert("Please login first.");

        return;
    }


    const text =
        document.getElementById("poemText").value.trim();


    if (!text) {

        alert("Please write something.");

        return;
    }


    const userDoc =
        await getDoc(
            doc(db, "users", currentUser.uid)
        );


    const userData = userDoc.data();


    await addDoc(
        collection(db, "posts"),
        {
            text: text,

            authorId: currentUser.uid,

            authorName: userData.name,

            likedBy: [],

            createdAt: serverTimestamp()
        }
    );


    document.getElementById("poemText").value = "";

    alert("Poem published.");

    loadPosts();

};


// ===============================
// LOAD POSTS
// ===============================

async function loadPosts() {

    const container =
        document.getElementById("postsContainer");


    container.innerHTML = "Loading...";


    try {

        const postsQuery =
            query(
                collection(db, "posts"),
                orderBy("createdAt", "desc")
            );


        const snapshot =
            await getDocs(postsQuery);


        container.innerHTML = "";


        if (snapshot.empty) {

            container.innerHTML =
                "<p>No poems yet.</p>";

            return;
        }


        snapshot.forEach((postDoc) => {

            renderPost(
                postDoc.id,
                postDoc.data(),
                container
            );

        });

    }

    catch (error) {

        console.error(error);

        container.innerHTML =
            "<p>Unable to load poems.</p>";

    }

}


// ===============================
// RENDER POST
// ===============================

function renderPost(id, post, container) {

    const postElement =
        document.createElement("div");


    postElement.className = "post";


    const likedBy =
        post.likedBy || [];


    const isLiked =
        currentUser &&
        likedBy.includes(currentUser.uid);


    postElement.innerHTML = `

        <div class="post-author">
            ${escapeHTML(post.authorName)}
        </div>

        <div class="poem">
            ${escapeHTML(post.text)}
        </div>

        <div class="post-actions">

            <button onclick="toggleLike('${id}')">
                ${isLiked ? "Unlike" : "Like"}
                (${likedBy.length})
            </button>

            <button onclick="sharePost('${id}')">
                Share
            </button>

        </div>

        <div class="comments">

            <strong>Comments</strong>

            <div id="comments-${id}">
                Loading comments...
            </div>

            ${
                currentUser
                ?
                `
                <div class="comment-input">

                    <input
                        id="comment-${id}"
                        placeholder="Write a comment..."
                    >

                    <button
                        onclick="addComment('${id}')"
                    >
                        Comment
                    </button>

                </div>
                `
                :
                `
                <p>Login to comment.</p>
                `
            }

        </div>
    `;


    container.appendChild(postElement);


    loadComments(id);

}


// ===============================
// LIKE
// ===============================

window.toggleLike = async function(postId) {

    if (!currentUser) {

        alert("Please login to like.");

        return;
    }


    const postRef =
        doc(db, "posts", postId);


    const postSnapshot =
        await getDoc(postRef);


    const post =
        postSnapshot.data();


    const likedBy =
        post.likedBy || [];


    if (likedBy.includes(currentUser.uid)) {

        await updateDoc(
            postRef,
            {
                likedBy:
                    arrayRemove(currentUser.uid)
            }
        );

    }

    else {

        await updateDoc(
            postRef,
            {
                likedBy:
                    arrayUnion(currentUser.uid)
            }
        );

    }


    loadPosts();

};


// ===============================
// COMMENTS
// ===============================

window.addComment = async function(postId) {

    if (!currentUser) {

        alert("Please login first.");

        return;
    }


    const input =
        document.getElementById(
            "comment-" + postId
        );


    const text =
        input.value.trim();


    if (!text) {

        return;
    }


    const userDoc =
        await getDoc(
            doc(db, "users", currentUser.uid)
        );


    const userData =
        userDoc.data();


    await addDoc(
        collection(
            db,
            "posts",
            postId,
            "comments"
        ),
        {
            text: text,

            userId: currentUser.uid,

            userName: userData.name,

            createdAt: serverTimestamp()
        }
    );


    input.value = "";


    loadComments(postId);

};


// ===============================
// LOAD COMMENTS
// ===============================

async function loadComments(postId) {

    const container =
        document.getElementById(
            "comments-" + postId
        );


    if (!container) return;


    try {

        const commentsQuery =
            query(
                collection(
                    db,
                    "posts",
                    postId,
                    "comments"
                ),
                orderBy("createdAt", "asc")
            );


        const snapshot =
            await getDocs(commentsQuery);


        container.innerHTML = "";


        snapshot.forEach((commentDoc) => {

            const comment =
                commentDoc.data();


            const element =
                document.createElement("div");


            element.className = "comment";


            element.innerHTML =
                `<strong>
                    ${escapeHTML(comment.userName)}
                </strong>: 
                ${escapeHTML(comment.text)}`;


            container.appendChild(element);

        });


        if (snapshot.empty) {

            container.innerHTML =
                "<p>No comments yet.</p>";

        }

    }

    catch (error) {

        console.error(error);

    }

}


// ===============================
// SHARE
// ===============================

window.sharePost = async function(postId) {

    const url =
        window.location.origin +
        window.location.pathname +
        "?post=" +
        postId;


    if (navigator.share) {

        try {

            await navigator.share({

                title: "Poetry",

                text: "Read this poem",

                url: url

            });

        }

        catch (error) {

            console.log(error);

        }

    }

    else {

        await navigator.clipboard.writeText(url);

        alert("Poem link copied.");

    }

};


// ===============================
// PROFILE
// ===============================

async function loadProfile() {

    if (!currentUser) return;


    const userSnapshot =
        await getDoc(
            doc(db, "users", currentUser.uid)
        );


    if (userSnapshot.exists()) {

        const user =
            userSnapshot.data();


        document.getElementById("profileName")
            .innerText = user.name;


        document.getElementById("profileEmail")
            .innerText = user.email;

    }


    const postsQuery =
        query(
            collection(db, "posts"),
            where(
                "authorId",
                "==",
                currentUser.uid
            )
        );


    const snapshot =
        await getDocs(postsQuery);


    const container =
        document.getElementById("myPosts");


    container.innerHTML = "";


    snapshot.forEach((postDoc) => {

        renderPost(
            postDoc.id,
            postDoc.data(),
            container
        );

    });


    if (snapshot.empty) {

        container.innerHTML =
            "<p>You have not published any poem.</p>";

    }

}


// ===============================
// SECURITY AGAINST HTML
// ===============================

function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;

}


// ===============================
// INITIAL PAGE
// ===============================

showPage("home");
