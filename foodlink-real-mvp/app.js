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
  loadListings();
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
    data: { user },
    error: userError
  } = await sb.auth.getUser();

  if (userError || !user) {
    profile = null;
    updateNav(false);
    return;
  }

  // Find the user's FoodLink profile
  const { data: existingProfile, error: profileError } = await sb
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // If profile doesn't exist, create it
  if (!existingProfile) {
    const name =
      user.user_metadata?.display_name || "FoodLink User";

    const role =
      user.user_metadata?.role || "provider";

    const { data: newProfile, error: createError } = await sb
  .from("profiles")
  .upsert({
    id: user.id,
    display_name: name,
    role: role
  })
  .select()
  .single();

    if (createError) {
      console.error("Could not create profile:", createError);
      profile = null;
      updateNav(true);
      return;
    }

    profile = newProfile;
  } else {
    profile = existingProfile;
  }

  updateNav(true);
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

  show("browse");
  await loadListings();

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
  const grid = document.getElementById("listingGrid");

  if (!grid) return;

  grid.innerHTML = `
    <div class="card">
      <p class="muted">Loading available food...</p>
    </div>
  `;

  const { data, error } = await sb
    .from("food_listings")
    .select("*")
    .eq("status", "available")
    .gt("pickup_deadline", new Date().toISOString())
    .order("pickup_deadline", { ascending: true });

  if (error) {
    console.error(error);

    grid.innerHTML = `
      <div class="card">
        <p>Unable to load available food.</p>
        <p class="muted">${error.message}</p>
      </div>
    `;

    return;
  }

  if (!data || data.length === 0) {
    grid.innerHTML = `
      <div class="card">
        <h3>No food available right now</h3>
        <p class="muted">
          New surplus food listings will appear here.
        </p>
      </div>
    `;

    return;
  }

  grid.innerHTML = data.map(food => {

    const quantity =
      food.available_quantity !== null
        ? `${food.available_quantity} ${food.quantity_unit || "meals"}`
        : food.quantity;

    return `
      <div class="card">

        <span class="badge">${escapeHtml(food.food_type)}</span>

        <h3>${escapeHtml(food.food_name)}</h3>

        <p>
          <strong>Available:</strong>
          ${escapeHtml(String(quantity))}
        </p>

        <p>
          <strong>Location:</strong>
          ${escapeHtml(food.location)}
        </p>

        <p>
          <strong>Pickup before:</strong>
          ${new Date(food.pickup_deadline).toLocaleString()}
        </p>

        ${
          food.notes
            ? `<p class="muted">${escapeHtml(food.notes)}</p>`
            : ""
        }

        <button
          class="primary full"
          onclick="openReceiverForm('${food.id}')"
        >
          Apply to Receive
        </button>

      </div>
    `;
  }).join("");
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
// =========================================================
// RECEIVER APPLICATION
// =========================================================

async function openReceiverForm(listingId) {

  const modal = document.getElementById("receiverModal");
  const listingInput = document.getElementById("receiverListingId");
  const message = document.getElementById("receiverMsg");

  if (!modal || !listingInput) return;

  listingInput.value = listingId;

  message.textContent = "";
  message.className = "message";

  document.getElementById("receiverForm").reset();

  // Reset listing ID because reset() clears it
  listingInput.value = listingId;

  modal.classList.remove("hidden");

  document.getElementById("receiverName").focus();
}


function closeReceiverForm() {

  const modal = document.getElementById("receiverModal");

  if (modal) {
    modal.classList.add("hidden");
  }

}


async function submitReceiverRequest(event) {

  event.preventDefault();

  const button =
    document.getElementById("receiverSubmitButton");

  const message =
    document.getElementById("receiverMsg");

  const listingId =
    document.getElementById("receiverListingId").value;

  const receiverName =
    document.getElementById("receiverName").value.trim();

  const phone =
    document.getElementById("receiverPhone").value.trim();

  const location =
    document.getElementById("receiverLocation").value.trim();

  const quantity =
    Number(document.getElementById("receiverQuantity").value);

  const notes =
    document.getElementById("receiverNotes").value.trim();


  if (!listingId) {
    message.textContent = "Food listing not found.";
    message.className = "message error";
    return;
  }


  if (!receiverName || !phone || !location) {
    message.textContent =
      "Please fill in all required fields.";

    message.className = "message error";
    return;
  }


  if (!quantity || quantity <= 0) {
    message.textContent =
      "Please enter a valid quantity.";

    message.className = "message error";
    return;
  }


  button.disabled = true;
  button.textContent = "Submitting...";

  message.textContent = "";


  try {

    const { data, error } = await sb.rpc(
      "apply_to_receive",
      {
        p_listing_id: listingId,
        p_receiver_name: receiverName,
        p_phone: phone,
        p_location: location,
        p_requested_quantity: quantity,
        p_notes: notes || null
      }
    );


    if (error) {
      throw error;
    }


    console.log("Receiver request:", data);


    message.textContent =
      "Request submitted successfully!";

    message.className = "message success";


    showToast(
      "Food request submitted successfully."
    );


    // Wait briefly so user sees success
    setTimeout(async () => {

      closeReceiverForm();

      await loadListings();

    }, 1200);


  } catch (error) {

    console.error(error);

    message.textContent =
      error.message ||
      "Unable to submit request.";

    message.className = "message error";

  } finally {

    button.disabled = false;
    button.textContent = "Apply to Receive";

  }

}

// ===============================
// START APP
// ===============================

init();