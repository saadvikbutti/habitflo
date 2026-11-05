// ==========================================
// ELEMENTS
// ==========================================

const habitForm = document.querySelector("#habit-form");
const habitInput = document.querySelector("#habit-name");
const habitsList = document.querySelector("#habits-list");
const emptyState = document.querySelector("#empty-state");
const formError = document.querySelector("#form-error");

const todayDate = document.querySelector("#today-date");
const completedCount = document.querySelector("#completed-count");
const progressValue = document.querySelector("#progress-value");
const progressCircle = document.querySelector("#progress-circle");
const progressMessage = document.querySelector("#progress-message");
const currentStreak = document.querySelector("#current-streak");
const activeCount = document.querySelector("#active-count");
const habitCount = document.querySelector("#habit-count");

const STORAGE_KEY = "habitflo-data";

// ==========================================
// DATE HELPERS
// ==========================================

function getDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getDateFromKey(key) {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function getPreviousDate(key) {
    const date = getDateFromKey(key);
    date.setDate(date.getDate() - 1);
    return getDateKey(date);
}

function displayDate() {
    todayDate.textContent = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric"
    }).toUpperCase();
}

// ==========================================
// SAMPLE DATA
// ==========================================

function createSampleHabits() {
    const examples = [
        "Read 20 pages",
        "Exercise for 30 minutes",
        "Study Java for 1 hour",
        "Drink 2L water"
    ];

    return examples.map((name, index) => ({
        id: `sample-${index + 1}`,
        name,
        createdAt: getDateKey(),
        completedDates: []
    }));
}

// ==========================================
// LOCAL STORAGE
// ==========================================

function loadHabits() {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);

        if (savedData === null) {
            return createSampleHabits();
        }

        const parsedData = JSON.parse(savedData);

        if (!Array.isArray(parsedData)) {
            throw new Error("Invalid saved habit data");
        }

        return parsedData.filter(habit =>
            habit &&
            typeof habit.id === "string" &&
            typeof habit.name === "string" &&
            typeof habit.createdAt === "string" &&
            Array.isArray(habit.completedDates) &&
            habit.completedDates.every(date =>
                typeof date === "string"
            )
        );

    } catch (error) {
        console.error("Unable to load habits:", error);
        return [];
    }
}

let habits = loadHabits();

function saveHabits() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
        return true;
    } catch (error) {
        console.error("Unable to save habits:", error);
        alert("Unable to save your changes. Check your browser storage.");
        return false;
    }
}

// ==========================================
// HABIT STREAK
// ==========================================

function calculateHabitStreak(habit) {
    const completed = new Set(habit.completedDates);
    let date = getDateKey();
    let streak = 0;

    // Allow yesterday to be the latest completed day.
    if (!completed.has(date)) {
        date = getPreviousDate(date);
    }

    while (completed.has(date)) {
        streak++;
        date = getPreviousDate(date);
    }

    return streak;
}

// Overall streak: consecutive days on which
// every currently active habit was completed.

function calculateOverallStreak() {
    if (habits.length === 0) {
        return 0;
    }

    const allCompletedDates = habits.map(habit =>
        new Set(habit.completedDates)
    );

    let date = getDateKey();

    const completedToday = allCompletedDates.every(set =>
        set.has(date)
    );

    if (!completedToday) {
        date = getPreviousDate(date);
    }

    let streak = 0;

    while (allCompletedDates.every(set => set.has(date))) {
        streak++;
        date = getPreviousDate(date);
    }

    return streak;
}

// ==========================================
// ADD HABIT
// ==========================================

function addHabit(name) {
    const habit = {
        id: crypto.randomUUID(),
        name: name,
        createdAt: getDateKey(),
        completedDates: []
    };

    habits.push(habit);

    if (!saveHabits()) {
        habits.pop();
        return;
    }

    renderApp();
}

habitForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const name = habitInput.value.trim();

    if (!name) {
        formError.textContent = "Please enter a habit name.";
        return;
    }

    const duplicate = habits.some(habit =>
        habit.name.toLowerCase() === name.toLowerCase()
    );

    if (duplicate) {
        formError.textContent = "This habit already exists.";
        return;
    }

    formError.textContent = "";

    addHabit(name);

    habitInput.value = "";
    habitInput.focus();
});

// ==========================================
// COMPLETE / UNDO HABIT
// ==========================================

function toggleHabit(id) {
    const habit = habits.find(habit => habit.id === id);

    if (!habit) return;

    const today = getDateKey();
    const index = habit.completedDates.indexOf(today);

    if (index === -1) {
        habit.completedDates.push(today);
    } else {
        habit.completedDates.splice(index, 1);
    }

    saveHabits();
    renderApp();
}

// ==========================================
// DELETE HABIT
// ==========================================

function deleteHabit(id) {
    const habit = habits.find(habit => habit.id === id);

    if (!habit) return;

    const confirmed = confirm(
        `Are you sure you want to delete "${habit.name}"?`
    );

    if (!confirmed) return;

    const previousHabits = [...habits];

    habits = habits.filter(habit => habit.id !== id);

    if (!saveHabits()) {
        habits = previousHabits;
        return;
    }

    renderApp();
}

// ==========================================
// RENDER HABITS
// ==========================================

function renderHabits() {
    habitsList.replaceChildren();

    const today = getDateKey();

    emptyState.hidden = habits.length !== 0;

    habits.forEach(habit => {
        const isCompleted = habit.completedDates.includes(today);
        const streak = calculateHabitStreak(habit);

        const article = document.createElement("article");
        article.className = `habit_card${isCompleted ? " completed" : ""}`;

        const details = document.createElement("div");
        details.className = "habit_details";

        const checkButton = document.createElement("button");
        checkButton.className = "habit_check";
        checkButton.type = "button";
        checkButton.textContent = isCompleted ? "✓" : "";
        checkButton.setAttribute(
            "aria-label",
            isCompleted ? "Undo completion" : "Complete habit"
        );
        checkButton.addEventListener("click", () => {
            toggleHabit(habit.id);
        });

        const text = document.createElement("div");
        text.className = "habit_text";

        const name = document.createElement("h3");
        name.textContent = habit.name;

        const category = document.createElement("p");
        category.textContent = "PERSONAL HABIT";

        const streakText = document.createElement("div");
        streakText.className = "habit_streak";
        streakText.textContent = `${streak} day${streak === 1 ? "" : "s"} streak`;

        text.append(name, category, streakText);
        details.append(checkButton, text);

        const actions = document.createElement("div");
        actions.className = "habit_actions";

        const completeButton = document.createElement("button");
        completeButton.className = "complete_btn";
        completeButton.type = "button";
        completeButton.textContent = isCompleted ? "Undo" : "Complete";

        completeButton.addEventListener("click", () => {
            toggleHabit(habit.id);
        });

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete_btn";
        deleteButton.type = "button";
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", () => {
            deleteHabit(habit.id);
        });

        actions.append(completeButton, deleteButton);
        article.append(details, actions);

        habitsList.append(article);
    });
}

// ==========================================
// UPDATE PROGRESS
// ==========================================

function renderProgress() {
    const today = getDateKey();

    const total = habits.length;

    const completed = habits.filter(habit =>
        habit.completedDates.includes(today)
    ).length;

    const percentage = total === 0
        ? 0
        : Math.round((completed / total) * 100);

    completedCount.textContent = `${completed}/${total}`;

    progressValue.textContent = `${percentage}%`;

    progressCircle.style.setProperty(
        "--progress",
        `${percentage}%`
    );

    progressCircle.setAttribute("aria-valuenow", percentage);

    if (total === 0) {
        progressMessage.textContent = "Add your first habit!";
    } else if (percentage === 100) {
        progressMessage.textContent = "Amazing! All habits completed!";
    } else if (percentage >= 50) {
        progressMessage.textContent = "You're more than halfway there!";
    } else if (percentage > 0) {
        progressMessage.textContent = "Great start! Keep going!";
    } else {
        progressMessage.textContent = "Let's get started!";
    }

    currentStreak.textContent =
        `${calculateOverallStreak()} Days`;

    activeCount.textContent = total;

    habitCount.textContent =
        `${total} ${total === 1 ? "HABIT" : "HABITS"}`;
}

// ==========================================
// RENDER EVERYTHING
// ==========================================

function renderApp() {
    renderHabits();
    renderProgress();
    displayDate();
}

// ==========================================
// INITIALIZE
// ==========================================

renderApp();