// 1) Create a free Supabase project.
// 2) Put your Project URL and publishable/anon key below.
// 3) Run supabase-schema.sql in Supabase SQL Editor.
// Never put the service_role/secret key in this file.

const SUPABASE_URL = "https://lbbcatvmysalchvqkmrp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_CClP0w1FnNWRITdlNNacCw_fS3CC2_Y";

let sb = null;
let authAction = "login";
let profile = null;


// ===============================
// SUPABASE SETUP
// ===============================

function configured() {
  return SUPABASE_URL.startsWith("https://") &&
         SUPABASE_ANON_KEY.length > 20;
}

function init() {
  if (!configured()) {
    document.getElementById("authMsg").style.display = "block";
    document.getElementById("authMsg").textContent =
      "Setup needed: add your Supabase URL and publishable key in app.js.";
    return;
  }

  sb = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  sb.auth.onAuthStateChange(async () => {
    await loadUser();
  });

  loadUser();
}


// ===============================
// SHOW / HIDE PASSWORD
// ===============================

function togglePassword() {
  const password = document.getElementById("password");
  const button = document.querySelector(".show-password");

  if (password.type === "password") {
    password.type = "text";
    button.textContent = "🙈";
    button.setAttribute("aria-label", "Hide password");
  } else {
    password.type = "password";
    button.textContent = "👁";
    button.setAttribute("aria-label", "Show password");
  }
}


// ===============================
// LOAD CURRENT USER
// ===============================

async function loadUser() {
  if (!sb) return;

  const {
    data: { user }
  } = await sb.auth.getUser();

  if (user) {

    const { data } = await sb
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    profile = data;

    updateNav(true);

  } else {

    profile = null;
    updateNav(false);

  }
}


// ===============================
// NAVIGATION
// ===============================

function updateNav(logged) {

  document.getElementById("navActions").innerHTML = logged

    ? `
      <button onclick="show('dashboard');loadDashboard()">
        Dashboard
      </button>

      <button onclick="show('browse');loadListings()">
        Available Food
      </button>

      <button onclick="logout()">
        Logout
      </button>
    `

    : `
      <button onclick="show('browse');loadListings()">
        Available Food
      </button>

      <button onclick="show('auth')">
        Login
      </button>
    `;
}


function show(id) {

  document
    .querySelectorAll(".page")
    .forEach(x => x.classList.remove("active"));

  document
    .getElementById(id)
    .classList.add("active");

  if (id === "browse") {
    loadListings();
  }

  if (id === "dashboard" && profile) {
    loadDashboard();
  }

  scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


// ===============================
// LOGIN / SIGNUP MODE
// ===============================

function authMode(mode) {

  authAction = mode;

  document
    .getElementById("loginTab")
    .classList.toggle("active", mode === "login");

  document
    .getElementById("signupTab")
    .classList.toggle("active", mode === "signup");

  document
    .getElementById("signupFields")
    .classList.toggle("hidden", mode === "login");

  document
    .getElementById("authTitle")
    .textContent =
      mode === "login"
        ? "Welcome back"
        : "Create your FoodLink account";

  document
    .getElementById("authButton")
    .textContent =
      mode === "login"
        ? "Login"
        : "Create account";
}


// ===============================
// LOGIN / SIGNUP
// ===============================

async function handleAuth(e) {

  e.preventDefault();

  if (!sb) {
    toast("Add Supabase settings in app.js first.");
    return;
  }

  const email =
    document.getElementById("email").value.trim();

  const password =
    document.getElementById("password").value;


  // ===============================
  // LOGIN
  // ===============================

  if (authAction === "login") {

    const { error } =
      await sb.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      return msg(error.message);
    }

   msg("Logged in successfully.");
  await loadUser();
  show("dashboard");
  await loadDashboard();
  return;
  }


  // ===============================
  // SIGN UP
  // ===============================

  const name =
    document.getElementById("orgName").value.trim();

  const role =
    document.getElementById("role").value;

  if (!name) {
    return msg(
      "Enter your organization/business name."
    );
  }


  // IMPORTANT:
  // This tells Supabase where to send the user
  // after they click the email confirmation link.

  const { data, error } =
    await sb.auth.signUp({

      email,

      password,

      options: {

        emailRedirectTo:
          "https://foodlinkproject.vercel.app/",

        data: {
          display_name: name,
          role: role
        }

      }

    });


  if (error) {
    return msg(error.message);
  }


  // Try to create/update profile
  // if a session is available.

  if (data.user && data.session) {

    await sb
      .from("profiles")
      .upsert({
        id: data.user.id,
        display_name: name,
        role: role
      });

  }


  msg(
    "Account created. Check your email and click the confirmation link. You will be returned to FoodLink."
  );
}


// ===============================
// LOGOUT
// ===============================

async function logout() {

  if (sb) {
    await sb.auth.signOut();
  }

  profile = null;

  show("home");

  toast("Logged out");
}


// ===============================
// MESSAGES
// ===============================

function msg(t) {

  const element =
    document.getElementById("authMsg");

  element.textContent = t;

  element.style.display = "block";
}


function toast(t) {

  const x =
    document.getElementById("toast");

  x.textContent = t;

  x.style.display = "block";

  setTimeout(() => {
    x.style.display = "none";
  }, 3000);
}


// ===============================
// HTML ESCAPE
// ===============================

function esc(s) {

  return String(s ?? "")
    .replace(
      /[&<>"']/g,
      m =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"
        }[m])
    );
}


// ===============================
// LOAD AVAILABLE FOOD
// ===============================

async function loadListings() {

  const grid =
    document.getElementById("listingGrid");

  if (!sb) {

    grid.innerHTML = `
      <div class="empty">
        Connect Supabase to load real listings.
      </div>
    `;

    return;
  }


  const {
    data,
    error
  } = await sb
    .from("food_listings")
    .select(
      "*,profiles(display_name)"
    )
    .eq("status", "available")
    .gt(
      "pickup_deadline",
      new Date().toISOString()
    )
    .order("pickup_deadline");


  if (error) {

    grid.innerHTML = `
      <div class="empty">
        ${esc(error.message)}
      </div>
    `;

    return;
  }


  if (!data?.length) {

    grid.innerHTML = `
      <div class="empty">
        No active surplus food is available right now.
      </div>
    `;

    return;
  }


  grid.innerHTML =
    data
      .map(
        x => `

        <article class="card">

          <span class="tag">
            ${esc(x.food_type)}
          </span>

          <h3>
            ${esc(x.food_name)}
          </h3>

          <div class="meta">

            🏪
            ${esc(
              x.profiles?.display_name ||
              "Food provider"
            )}

            <br>

            📦
            ${esc(x.quantity)}

            <br>

            📍
            ${esc(x.location)}

            <br>

            ⏰ Pickup before
            ${new Date(
              x.pickup_deadline
            ).toLocaleString()}

          </div>

          ${
            profile?.role === "organization"

              ? `
                <button
                  class="primary"
                  onclick="claim('${x.id}')"
                >
                  Claim food
                </button>
              `

              : ""
          }

        </article>

      `
      )
      .join("");
}


// ===============================
// CLAIM FOOD
// ===============================

async function claim(id) {

  if (
    !profile ||
    profile.role !== "organization"
  ) {

    show("auth");

    return;
  }


  const {
    data,
    error
  } = await sb.rpc(
    "claim_food",
    {
      listing_id: id
    }
  );


  if (error) {
    return toast(error.message);
  }


  toast(
    "Food claimed successfully."
  );

  loadListings();


  if (
    document
      .getElementById("dashboard")
      .classList
      .contains("active")
  ) {

    loadDashboard();

  }
}


// ===============================
// DASHBOARD
// ===============================

async function loadDashboard() {

  if (!profile) {
    show("auth");
    return;
  }


  document
    .getElementById("dashTitle")
    .textContent =
      profile.role === "provider"
        ? "Provider Dashboard"
        : "Organization Dashboard";


  document
    .getElementById("dashSubtitle")
    .textContent =
      `Welcome, ${profile.display_name}`;


  if (profile.role === "provider") {

    renderProvider();

  } else {

    renderOrganization();

  }
}


// ===============================
// PROVIDER DASHBOARD
// ===============================

async function renderProvider() {

  const {
    data
  } = await sb
    .from("food_listings")
    .select("*")
    .eq(
      "provider_id",
      profile.id
    )
    .order(
      "created_at",
      {
        ascending: false
      }
    );


  const rows = data || [];


  document
    .getElementById("dashboardContent")
    .innerHTML = `

      <div class="stats">

        <div class="stat">
          Active listings
          <strong>
            ${
              rows.filter(
                x => x.status === "available"
              ).length
            }
          </strong>
        </div>

        <div class="stat">
          Claimed
          <strong>
            ${
              rows.filter(
                x => x.status === "claimed"
              ).length
            }
          </strong>
        </div>

        <div class="stat">
          Completed
          <strong>
            ${
              rows.filter(
                x => x.status === "completed"
              ).length
            }
          </strong>
        </div>

      </div>


      <div class="two">

        <div class="card">

          <h3>
            Post surplus food
          </h3>

          <form onsubmit="postFood(event)">

            <label>
              Food name

              <input
                id="fName"
                required
                placeholder="e.g. Rice, dal and vegetable curry"
              >

            </label>


            <label>
              Food type

              <select id="fType">

                <option>
                  Cooked meals
                </option>

                <option>
                  Rice & curry
                </option>

                <option>
                  Bakery
                </option>

                <option>
                  Fruits
                </option>

                <option>
                  Other
                </option>

              </select>

            </label>


            <label>
              Quantity

              <input
                id="fQty"
                required
                placeholder="e.g. 40 meals / 10 kg"
              >

            </label>


            <label>
              Pickup location

              <input
                id="fLoc"
                required
                placeholder="Area and city"
              >

            </label>


            <label>
              Pickup deadline

              <input
                id="fDeadline"
                required
                type="datetime-local"
              >

            </label>


            <label>
              Notes

              <textarea
                id="fNotes"
                placeholder="Allergen information, packaging, etc."
              ></textarea>

            </label>


            <button class="primary">
              Publish listing
            </button>

          </form>

        </div>


        <div class="card">

          <h3>
            My listings
          </h3>

          ${
            rows.length

              ? rows
                  .map(
                    x => `

                    <div
                      class="step"
                      style="color:#17351f"
                    >

                      <span>
                        <b>
                          ${esc(x.status)}
                        </b>
                      </span>

                      <span>

                        <strong>
                          ${esc(x.food_name)}
                        </strong>

                        <br>

                        <small>
                          ${esc(x.quantity)}
                          •
                          ${esc(x.location)}
                        </small>

                      </span>

                    </div>

                  `
                  )
                  .join("")

              : `
                <p class="muted">
                  No listings yet.
                </p>
              `
          }

        </div>

      </div>

    `;
}


// ===============================
// POST FOOD
// ===============================

async function postFood(e) {

  e.preventDefault();


  const row = {

    provider_id:
      profile.id,

    food_name:
      document.getElementById("fName").value,

    food_type:
      document.getElementById("fType").value,

    quantity:
      document.getElementById("fQty").value,

    location:
      document.getElementById("fLoc").value,

    pickup_deadline:
      new Date(
        document.getElementById("fDeadline").value
      ).toISOString(),

    notes:
      document.getElementById("fNotes").value,

    status:
      "available"

  };


  const {
    error
  } = await sb
    .from("food_listings")
    .insert(row);


  if (error) {
    return toast(error.message);
  }


  toast(
    "Surplus food published."
  );


  e.target.reset();

  loadDashboard();
}


// ===============================
// ORGANIZATION DASHBOARD
// ===============================

async function renderOrganization() {

  const {
    data
  } = await sb
    .from("food_claims")
    .select(
      "*,food_listings(*)"
    )
    .eq(
      "organization_id",
      profile.id
    )
    .order(
      "created_at",
      {
        ascending: false
      }
    );


  document
    .getElementById("dashboardContent")
    .innerHTML = `

      <div class="stats">

        <div class="stat">
          My claims

          <strong>
            ${data?.length || 0}
          </strong>

        </div>


        <div class="stat">
          Open listings

          <strong>
            View below
          </strong>

        </div>


        <div class="stat">
          Status

          <strong>
            Verified account
          </strong>

        </div>

      </div>


      <div class="card">

        <h3>
          My pickup requests
        </h3>


        ${
          data?.length

            ? data
                .map(
                  x => `

                  <div
                    class="step"
                    style="color:#17351f"
                  >

                    <span>
                      <b>
                        ${esc(x.status)}
                      </b>
                    </span>


                    <span>

                      <strong>
                        ${esc(
                          x.food_listings?.food_name
                        )}
                      </strong>

                      <br>

                      <small>
                        ${esc(
                          x.food_listings?.quantity
                        )}
                        •
                        ${esc(
                          x.food_listings?.location
                        )}
                      </small>

                    </span>

                  </div>

                `
                )
                .join("")

            : `
              <p class="muted">

                You have not claimed any food yet.

                <button
                  class="secondary"
                  onclick="show('browse')"
                >
                  Browse food
                </button>

              </p>
            `
        }

      </div>

    `;
}


// ===============================
// START APP
// ===============================

init();