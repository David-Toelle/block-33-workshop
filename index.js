const pg = require("pg");
const express = require("express");
const client = new pg.Client(
  process.env.DATABASE_URL ||
    "postgres://postgres:123@localhost:5432/acme_hr_directory"
);
const app = express();
const path = require("path");
// Middleware to parse JSON request bodies
app.use(express.json());

// ROUTES 

app.get("/api/employees", async (req, res) => {
  try {
    const result = await client.query("SELECT * FROM employees ORDER BY id");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching employees:", err.message);
    res.status(500).json({ error: "Error fetching employees" });
  }
});

app.get("/api/departments", async (req, res) => {
  try {
    const result = await client.query("SELECT * FROM departments ORDER BY id");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching employees:", err.message);
    res.status(500).json({ error: "Error fetching employees" });
  }
});

app.post("/api/employees", async (req, res) => {
  const { name, department_id } = req.body;
  try {
    const result = await client.query(
      "INSERT INTO employees (name, department_id) VALUES ($1, $2) RETURNING *",
      [name, department_id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error creating employee:", err.message);
    res.status(500).json({ error: "Error creating employee" });
  }
});

app.delete("/api/employees/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await client.query("DELETE FROM employees WHERE id = $1", [
      id,
    ]);

    res.status(204).end();
  } catch (err) {
    console.error(`Error deleting employee with id ${id}:`, err.message);
    res.status(500).json({ error: `Error deleting employee with id ${id}` });
  }
});

app.put("/api/employees/:id", async (req, res) => {
  const  { id } = req.params;
  const { name, department_id } =req.body
  try {
    const result = await client.query(
       "UPDATE employees SET name = $1, department_id = $2, updated_at = now() WHERE id = $3 RETURNING *",
       [name, department_id,id]
    );
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({error: `Employee with id ${id} not found`});
    }
  } catch (err) {
    console.error(`Error updating employee with id ${id}:`, err.message)
    res.status(500).json({ error: `Error updating employee with id ${id}`}); 
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Recommended: Exit the process on unhandled rejections to avoid unpredictable state
  process.exit(1);
});

const init = async () => {
  try {
    await client.connect();
    console.log("connected to database");

    //create tables
    await createTables();
    console.log("tables created");

    // seed database
    await seedData();
    console.log("data seeded");

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error("Error setting up the server:", err.message);
  }
};

const createTables = async () => {
  const createDepartmentsTableQuery = `
    CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL
    );
    `; 

  const createEmployeesTableQuery = `
    CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        department_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now(),
        FOREIGN KEY (department_id) REFERENCES departments(id)
    );
    `;

  try {
    await client.query(createDepartmentsTableQuery);
    await client.query(createEmployeesTableQuery);
    console.log("Tables created");
  } catch (err) {
    console.error("Error creating tables:", err.message);
    throw err;
  }
};

const seedData = async () => {
  try {
    // Check if departments table already has data
    const checkDepartmentsQuery = "SELECT COUNT(*) FROM departments";
    const departmentsResult = await client.query(checkDepartmentsQuery);
    const departmentsCount = parseInt(departmentsResult.rows[0].count, 10);

    if (departmentsCount === 0) {
      // Insert departments data if table is empty
      const insertDepartmentsQuery = `
        INSERT INTO departments (name) VALUES 
          ('Engineering'),
          ('Human Resources'),
          ('Marketing');
      `;
      await client.query(insertDepartmentsQuery);
      console.log("Departments seeded");
    } else {
      console.log("Departments already seeded");
    }

    // Check if employees table already has data
    const checkEmployeesQuery = "SELECT COUNT(*) FROM employees";
    const employeesResult = await client.query(checkEmployeesQuery);
    const employeesCount = parseInt(employeesResult.rows[0].count, 10);

    if (employeesCount === 0) {
      // Insert employees data if table is empty
      const insertEmployeesQuery = `
        INSERT INTO employees (name, department_id) VALUES 
          ('John joe', 1),
          ('Jane Smith', 2),
          ('Michael Johnson', 1),
          ('Emily Davis', 3);
      `;
      await client.query(insertEmployeesQuery);
      console.log("Employees seeded");
    } else {
      console.log("Employees already seeded");
    }
  } catch (err) {
    console.error("Error seeding data:", err.message);
    throw err;
  }
};

init();
