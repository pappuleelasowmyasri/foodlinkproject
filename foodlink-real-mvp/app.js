// =========================================================
// FOODLINK APP
// =========================================================

// Supabase project
const SUPABASE_URL = "https://lbbcatvmysalchvqkmrp.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_CClP0w1FnNWRITdlNNacCw_fS3CC2_Y";

let sb = null;
let authAction = "login";
let profile = null;


// =========================================================
// SUPABASE SETUP
// =========================================================

function configured() {
  return (
    SUPABASE_URL.startsWith("https://") &&
    SUPABASE_ANON_KEY.length > 20
  );
}


function init() {

  if (!configured()) {

    const authMsg =
      document.getElementById("authMsg");

    if (authMsg) {

      authMsg.style.display = "block";

      authMsg.textContent =
        "Setup needed: add your Supabase URL and publishable key in app.js.";

    }

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


// =========================================================
// PASSWORD
// =========================================================

function togglePassword() {

  const password =
    document.getElementById("password");

  const button =
    document.querySelector(".show-password");


  if (!password) return;


  if (password.type === "password") {

    password.type = "text";

    if (button) {
      button.textContent = "🙈";
      button.setAttribute(
        "aria-label",
        "Hide password"
      );
    }

  } else {

    password.type = "password";

    if (button) {
      button.textContent = "👁";
      button.setAttribute(
        "aria-label",
        "Show password"
      );
    }

  }

}


// =========================================================
// LOAD CURRENT USER
// =========================================================

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


  const {
    data: existingProfile,
    error: profileError
  } = await sb

    .from("profiles")

    .select("*")

    .eq("id", user.id)

    .maybeSingle();


  if (profileError) {

    console.error(
      "Profile error:",
      profileError
    );

  }


  if (!existingProfile) {

    const name =
      user.user_metadata?.display_name ||
      "FoodLink User";


    const role =
      user.user_metadata?.role ||
      "provider";


    const {
      data: newProfile,
      error: createError
    } = await sb

      .from("profiles")

      .upsert(
        {
          id: user.id,
          display_name: name,
          role: role
        },
        {
          onConflict: "id"
        }
      )

      .select()

      .single();


    if (createError) {

      console.error(
        "Could not create profile:",
        createError
      );

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


// =========================================================
// NAVIGATION
// =========================================================

function updateNav(logged) {

  const nav =
    document.getElementById("navActions");

  if (!nav) return;


  if (logged) {

    nav.innerHTML = `

      <button
        onclick="show('dashboard');loadDashboard()"
      >
        Dashboard
      </button>

      <button
        onclick="show('browse');loadListings()"
      >
        Available Food
      </button>

      <button onclick="logout()">
        Logout
      </button>

    `;

  } else {

    nav.innerHTML = `

      <button
        onclick="show('browse');loadListings()"
      >
        Available Food
      </button>

      <button onclick="show('auth')">
        Login
      </button>

    `;

  }

}


// =========================================================
// SHOW PAGE
// =========================================================

function show(id) {

  document
    .querySelectorAll(".page")
    .forEach(page => {

      page.classList.remove("active");

    });


  const page =
    document.getElementById(id);


  if (!page) return;


  page.classList.add("active");


  if (id === "browse") {

    loadListings();

  }


  if (
    id === "dashboard" &&
    profile
  ) {

    loadDashboard();

  }


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


// =========================================================
// AUTH MODE
// =========================================================

function authMode(mode) {

  authAction = mode;


  const loginTab =
    document.getElementById("loginTab");

  const signupTab =
    document.getElementById("signupTab");

  const signupFields =
    document.getElementById("signupFields");

  const authTitle =
    document.getElementById("authTitle");

  const authButton =
    document.getElementById("authButton");


  if (loginTab) {

    loginTab.classList.toggle(
      "active",
      mode === "login"
    );

  }


  if (signupTab) {

    signupTab.classList.toggle(
      "active",
      mode === "signup"
    );

  }


  if (signupFields) {

    signupFields.classList.toggle(
      "hidden",
      mode === "login"
    );

  }


  if (authTitle) {

    authTitle.textContent =
      mode === "login"
        ? "Welcome back"
        : "Create your FoodLink account";

  }


  if (authButton) {

    authButton.textContent =
      mode === "login"
        ? "Login"
        : "Create account";

  }

}


// =========================================================
// LOGIN / SIGNUP
// =========================================================

async function handleAuth(e) {

  e.preventDefault();


  if (!sb) {

    toast(
      "Add Supabase settings in app.js first."
    );

    return;

  }


  const email =
    document.getElementById("email")
      .value
      .trim();


  const password =
    document.getElementById("password")
      .value;


  // -------------------------------------------------------
  // LOGIN
  // -------------------------------------------------------

  if (authAction === "login") {

    const {
      error
    } = await sb.auth.signInWithPassword({

      email,

      password

    });


    if (error) {

      return msg(error.message);

    }


    msg(
      "Logged in successfully."
    );


    await loadUser();


    show("dashboard");


    await loadDashboard();


    return;

  }


  // -------------------------------------------------------
  // SIGNUP
  // -------------------------------------------------------

  const name =
    document.getElementById("orgName")
      .value
      .trim();


  const role =
    document.getElementById("role")
      .value;


  if (!name) {

    return msg(
      "Enter your organization/business name."
    );

  }


  const {
    data,
    error
  } = await sb.auth.signUp({

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


  if (
    data.user &&
    data.session
  ) {

    await sb

      .from("profiles")

      .upsert(
        {
          id: data.user.id,
          display_name: name,
          role: role
        },
        {
          onConflict: "id"
        }
      );

  }


  msg(
    "Account created. Check your email and click the confirmation link."
  );

}


// =========================================================
// LOGOUT
// =========================================================

async function logout() {

  if (sb) {

    await sb.auth.signOut();

  }


  profile = null;


  show("browse");


  await loadListings();


  toast("Logged out");

}


// =========================================================
// AUTH MESSAGE
// =========================================================

function msg(text) {

  const element =
    document.getElementById("authMsg");


  if (!element) return;


  element.textContent = text;

  element.style.display = "block";

}


// =========================================================
// TOAST
// =========================================================

function toast(text) {

  const element =
    document.getElementById("toast");


  if (!element) return;


  element.textContent = text;

  element.style.display = "block";


  setTimeout(() => {

    element.style.display = "none";

  }, 3000);

}


// =========================================================
// HTML ESCAPE
// =========================================================

function esc(value) {

  return String(value ?? "")

    .replace(
      /[&<>"']/g,
      character => {

        return {

          "&": "&amp;",

          "<": "&lt;",

          ">": "&gt;",

          '"': "&quot;",

          "'": "&#039;"

        }[character];

      }
    );

}


// =========================================================
// LOAD AVAILABLE FOOD
// =========================================================

async function loadListings() {

  const grid =
    document.getElementById("listingGrid");


  if (!grid || !sb) return;


  grid.innerHTML = `

    <div class="card">

      <p class="muted">
        Loading available food...
      </p>

    </div>

  `;


  const {
    data,
    error
  } = await sb

    .from("food_listings")

    .select("*")

    .eq(
      "status",
      "available"
    )

    .gt(
      "pickup_deadline",
      new Date().toISOString()
    )

    .order(
      "pickup_deadline",
      {
        ascending: true
      }
    );


  if (error) {

    console.error(
      "Listings error:",
      error
    );


    grid.innerHTML = `

      <div class="card">

        <h3>
          Unable to load available food
        </h3>

        <p class="muted">
          ${esc(error.message)}
        </p>

      </div>

    `;

    return;

  }


  if (
    !data ||
    data.length === 0
  ) {

    grid.innerHTML = `

      <div class="card">

        <h3>
          No food available right now
        </h3>

        <p class="muted">

          New surplus food listings
          will appear here.

        </p>

      </div>

    `;

    return;

  }


  grid.innerHTML = data

    .map(food => {


      let quantity;


      if (
        food.available_quantity !== null &&
        food.available_quantity !== undefined
      ) {

        quantity =
          `${food.available_quantity} ${
            food.quantity_unit || "meals"
          }`;

      } else {

        quantity =
          food.quantity || "Quantity not specified";

      }


      return `

        <div class="card">

          <span class="badge">

            ${esc(food.food_type)}

          </span>


          <h3>

            ${esc(food.food_name)}

          </h3>


          <p>

            <strong>
              Available:
            </strong>

            ${esc(quantity)}

          </p>


          <p>

            <strong>
              Location:
            </strong>

            ${esc(food.location)}

          </p>


          <p>

            <strong>
              Pickup before:
            </strong>

            ${new Date(
              food.pickup_deadline
            ).toLocaleString()}

          </p>


          ${
            food.notes

              ? `

                <p class="muted">

                  ${esc(food.notes)}

                </p>

              `

              : ""

          }


          <button

            class="primary full"

            onclick="
              openReceiverForm('${food.id}')
            "

          >

            Apply to Receive

          </button>


        </div>

      `;

    })

    .join("");

}


// =========================================================
// OPEN RECEIVER FORM
// =========================================================

async function openReceiverForm(listingId) {

  const modal =
    document.getElementById(
      "receiverModal"
    );


  const listingInput =
    document.getElementById(
      "receiverListingId"
    );


  const message =
    document.getElementById(
      "receiverMsg"
    );


  if (
    !modal ||
    !listingInput
  ) {

    console.error(
      "Receiver modal is missing from index.html"
    );

    toast(
      "Receiver form is not available."
    );

    return;

  }


  listingInput.value =
    listingId;


  if (message) {

    message.textContent = "";

    message.className =
      "message";

  }


  const form =
    document.getElementById(
      "receiverForm"
    );


  if (form) {

    form.reset();

  }


  // reset() clears hidden listing ID,
  // so set it again.
  listingInput.value =
    listingId;


  modal.classList.remove(
    "hidden"
  );


  const receiverName =
    document.getElementById(
      "receiverName"
    );


  if (receiverName) {

    receiverName.focus();

  }

}


// =========================================================
// CLOSE RECEIVER FORM
// =========================================================

function closeReceiverForm() {

  const modal =
    document.getElementById(
      "receiverModal"
    );


  if (modal) {

    modal.classList.add(
      "hidden"
    );

  }

}


// =========================================================
// SUBMIT RECEIVER REQUEST
// =========================================================

async function submitReceiverRequest(event) {

  event.preventDefault();


  const button =
    document.getElementById(
      "receiverSubmitButton"
    );


  const message =
    document.getElementById(
      "receiverMsg"
    );


  const listingId =
    document.getElementById(
      "receiverListingId"
    ).value;


  const receiverName =
    document.getElementById(
      "receiverName"
    ).value.trim();


  const phone =
    document.getElementById(
      "receiverPhone"
    ).value.trim();


  const location =
    document.getElementById(
      "receiverLocation"
    ).value.trim();


  const quantity =
    Number(
      document.getElementById(
        "receiverQuantity"
      ).value
    );


  const notes =
    document.getElementById(
      "receiverNotes"
    ).value.trim();


  if (!listingId) {

    message.textContent =
      "Food listing not found.";

    message.className =
      "message error";

    return;

  }


  if (
    !receiverName ||
    !phone ||
    !location
  ) {

    message.textContent =
      "Please fill in all required fields.";

    message.className =
      "message error";

    return;

  }


  if (
    !quantity ||
    quantity <= 0
  ) {

    message.textContent =
      "Please enter a valid quantity.";

    message.className =
      "message error";

    return;

  }


  button.disabled = true;

  button.textContent =
    "Submitting...";


  message.textContent = "";


  try {

    const {
      data,
      error
    } = await sb.rpc(

      "apply_to_receive",

      {

        p_listing_id:
          listingId,

        p_receiver_name:
          receiverName,

        p_phone:
          phone,

        p_location:
          location,

        p_requested_quantity:
          quantity,

        p_notes:
          notes || null

      }

    );


    if (error) {

      throw error;

    }


    console.log(
      "Receiver request:",
      data
    );


    message.textContent =
      "Request submitted successfully!";

    message.className =
      "message success";


    toast(
      "Food request submitted successfully."
    );


    setTimeout(async () => {

      closeReceiverForm();

      await loadListings();

    }, 1200);


  } catch (error) {

    console.error(
      "Receiver request error:",
      error
    );


    message.textContent =
      error.message ||
      "Unable to submit request.";

    message.className =
      "message error";


  } finally {

    button.disabled = false;

    button.textContent =
      "Apply to Receive";

  }

}


// =========================================================
// CLAIM FOOD
// =========================================================

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

    return toast(
      error.message
    );

  }


  toast(
    "Food claimed successfully."
  );


  await loadListings();


  if (

    document
      .getElementById("dashboard")
      .classList
      .contains("active")

  ) {

    await loadDashboard();

  }

}


// =========================================================
// DASHBOARD
// =========================================================

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


  if (
    profile.role === "provider"
  ) {

    await renderProvider();

  } else {

    await renderOrganization();

  }

}


// =========================================================
// PROVIDER DASHBOARD
// =========================================================

async function renderProvider() {

  const {
    data,
    error
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


  if (error) {

    console.error(
      "Provider listings error:",
      error
    );

  }


  const rows =
    data || [];


  document
    .getElementById(
      "dashboardContent"
    )
    .innerHTML = `

      <div class="stats">

        <div class="stat">

          Active listings

          <strong>

            ${
              rows.filter(
                x =>
                  x.status ===
                  "available"
              ).length
            }

          </strong>

        </div>


        <div class="stat">

          Claimed

          <strong>

            ${
              rows.filter(
                x =>
                  x.status ===
                  "claimed"
              ).length
            }

          </strong>

        </div>


        <div class="stat">

          Completed

          <strong>

            ${
              rows.filter(
                x =>
                  x.status ===
                  "completed"
              ).length
            }

          </strong>

        </div>

      </div>


      <div class="two">


        <!-- POST FOOD -->

        <div class="card">

          <h3>
            Post surplus food
          </h3>


          <form
            onsubmit="postFood(event)"
          >


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
                type="number"
                min="1"
                step="0.01"
                required
                placeholder="e.g. 40"
              >

            </label>


            <label>

              Unit

              <select id="fUnit">

                <option value="meals">
                  Meals
                </option>

                <option value="kg">
                  Kilograms (kg)
                </option>

                <option value="litres">
                  Litres
                </option>

                <option value="packets">
                  Packets
                </option>

                <option value="boxes">
                  Boxes
                </option>

              </select>

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


            <button
              class="primary"
              type="submit"
            >

              Publish listing

            </button>


          </form>

        </div>


        <!-- MY LISTINGS -->

        <div class="card">

          <h3>
            My listings
          </h3>


          ${
            rows.length

              ? rows
                  .map(x => {

                    const displayQuantity =

                      x.available_quantity !== null &&
                      x.available_quantity !== undefined

                        ? `${x.available_quantity} ${
                            x.quantity_unit ||
                            "meals"
                          }`

                        : x.quantity;


                    return `

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

                            ${esc(
                              displayQuantity
                            )}

                            •

                            ${esc(
                              x.location
                            )}

                          </small>

                        </span>

                      </div>

                    `;

                  })
                  .join("")

              : `

                <p class="muted">

                  No listings yet.

                </p>

              `

          }

        </div>


      </div>


      <!-- RECEIVER REQUESTS -->

      <div
        class="card"
        style="margin-top:18px"
      >

        <h3>
          Receiver Requests
        </h3>

        <div id="providerRequests">

          <p class="muted">
            Loading requests...
          </p>

        </div>

      </div>

    `;


  await loadProviderRequests();

}


// =========================================================
// POST FOOD
// =========================================================

async function postFood(e) {

  e.preventDefault();


  if (!profile) {

    return toast(
      "Please log in first."
    );

  }


  const quantity =
    Number(
      document.getElementById(
        "fQty"
      ).value
    );


  const unit =
    document.getElementById(
      "fUnit"
    ).value;


  if (
    !quantity ||
    quantity <= 0
  ) {

    return toast(
      "Enter a valid quantity."
    );

  }


  const row = {

    provider_id:
      profile.id,

    food_name:
      document
        .getElementById("fName")
        .value
        .trim(),

    food_type:
      document
        .getElementById("fType")
        .value,

    // Keep old quantity column
    // for compatibility
    quantity:
      `${quantity} ${unit}`,

    // New numeric quantity
    available_quantity:
      quantity,

    quantity_unit:
      unit,

    location:
      document
        .getElementById("fLoc")
        .value
        .trim(),

    pickup_deadline:
      new Date(
        document
          .getElementById(
            "fDeadline"
          )
          .value
      ).toISOString(),

    notes:
      document
        .getElementById("fNotes")
        .value
        .trim(),

    status:
      "available"

  };


  const {
    error
  } = await sb

    .from("food_listings")

    .insert(row);


  if (error) {

    console.error(
      "Post food error:",
      error
    );

    return toast(
      error.message
    );

  }


  toast(
    "Surplus food published."
  );


  e.target.reset();


  await loadDashboard();


  await loadListings();

}


// =========================================================
// PROVIDER RECEIVER REQUESTS
// =========================================================

async function loadProviderRequests() {

  const container =
    document.getElementById(
      "providerRequests"
    );


  if (!container) return;


  const {
    data,
    error
  } = await sb

    .from("receiver_requests")

    .select(`
      *,
      food_listings(
        food_name,
        quantity,
        quantity_unit
      )
    `)

    .order(
      "created_at",
      {
        ascending: false
      }
    );


  if (error) {

    console.error(
      "Receiver requests error:",
      error
    );


    container.innerHTML = `

      <p class="muted">

        Unable to load receiver requests.

      </p>

    `;

    return;

  }


  if (
    !data ||
    data.length === 0
  ) {

    container.innerHTML = `

      <p class="muted">

        No receiver requests yet.

      </p>

    `;

    return;

  }


  container.innerHTML = data

    .map(request => {

      const food =
        request.food_listings;


      return `

        <div
          class="step"
          style="color:#17351f"
        >

          <span>

            <b>
              ${esc(request.status)}
            </b>

          </span>


          <span>

            <strong>

              ${esc(
                request.receiver_name
              )}

            </strong>

            <br>

            <small>

              Food:
              ${esc(
                food?.food_name ||
                "Food listing"
              )}

              <br>

              Requested:
              ${esc(
                String(
                  request.requested_quantity
                )
              )}
              ${esc(
                food?.quantity_unit ||
                "units"
              )}

              <br>

              Phone:
              ${esc(
                request.phone
              )}

              <br>

              Location:
              ${esc(
                request.location
              )}

            </small>

          </span>

        </div>

      `;

    })

    .join("");

}


// =========================================================
// ORGANIZATION DASHBOARD
// =========================================================

async function renderOrganization() {

  const {
    data,
    error
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


  if (error) {

    console.error(
      "Organization dashboard error:",
      error
    );

  }


  document
    .getElementById(
      "dashboardContent"
    )
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
                          x.food_listings
                            ?.food_name
                        )}

                      </strong>

                      <br>

                      <small>

                        ${esc(
                          x.food_listings
                            ?.quantity
                        )}

                        •

                        ${esc(
                          x.food_listings
                            ?.location
                        )}

                      </small>

                    </span>

                  </div>

                `
                )
                .join("")

            : `

              <p class="muted">

                You have not claimed
                any food yet.

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
// START APP
// =========================================================

init();