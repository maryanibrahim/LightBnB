const { Pool } = require('pg');

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb',
  port: 5432,
});


//users
/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  const queryString = `
    SELECT * FROM users
    WHERE email = $1;
  `;

  const queryParams = [email];

  return pool.query(queryString, queryParams)
    .then((result) => result.rows[0] || null)
    .catch((err) => {
      console.error('Error executing query', err);
      return null;
    });
};


/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  const queryString = `
    SELECT *
    FROM users
    WHERE id = $1;
  `;

  const queryParams = [id];

  return pool.query(queryString, queryParams)
    .then(res => res.rows[0] || null)
    .catch(err => {
      console.error('Error executing query', err);
      return null;
    });
};


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  const queryString = `
    INSERT INTO users (name, email, password)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;

  const queryParams = [user.name, user.email, user.password];

  return pool.query(queryString, queryParams)
    .then((result) => result.rows[0] || null)
    .catch((err) => {
      console.error('Error executing query', err);
      return null;
    });
};

//Reservations
/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @param {number} limit The maximum number of reservations to retrieve.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  const queryString = `
    SELECT reservations.*, properties.*, AVG(property_reviews.rating) AS average_rating
    FROM reservations
    JOIN properties ON reservations.property_id = properties.id
    JOIN property_reviews ON properties.id = property_reviews.property_id
    WHERE reservations.guest_id = $1
    AND end_date >= now()::date
    GROUP BY reservations.id, properties.id
    ORDER BY start_date
    LIMIT $2;
  `;

  const queryParams = [guest_id, limit];

  return pool.query(queryString, queryParams)
    .then((result) => result.rows || [])
    .catch((err) => {
      console.error('Error executing query', err.stack);
      return [];
    });
};

//properties
/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function (options, limit = 10) {
  const queryParams = [];
  let queryString = `
    SELECT properties.*, AVG(property_reviews.rating) AS average_rating
    FROM properties
    LEFT JOIN property_reviews ON properties.id = property_reviews.property_id
  `;

  const whereClauses = [];
  const havingClauses = [];

  // Check if a city filter is provided
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    whereClauses.push(`city ILIKE $${queryParams.length}`);
  }

  // Check if an owner_id filter is provided
  if (options.owner_id) {
    queryParams.push(options.owner_id);
    whereClauses.push(`owner_id = $${queryParams.length}`);
  }

  // Check if a minimum price per night filter is provided
  if (options.minimum_price_per_night) {
    queryParams.push(options.minimum_price_per_night * 100);
    whereClauses.push(`cost_per_night >= $${queryParams.length}`);
  }

  // Check if a maximum price per night filter is provided
  if (options.maximum_price_per_night) {
    queryParams.push(options.maximum_price_per_night * 100);
    whereClauses.push(`cost_per_night <= $${queryParams.length}`);
  }

  // Check if a minimum rating filter is provided
  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating);
    havingClauses.push(`AVG(property_reviews.rating) >= $${queryParams.length}`);
  }

  // Check if any whereClauses have been added
  if (whereClauses.length > 0) {
    queryString += ` WHERE ${whereClauses.join(' AND ')} `;
  }

  queryString += `
    GROUP BY properties.id
  `;

  // Check if any havingClauses have been added
  if (havingClauses.length > 0) {
    queryString += ` HAVING ${havingClauses.join(' AND ')} `;
  }

  // Add the limit to the query
  queryParams.push(limit);
  queryString += `
    ORDER BY cost_per_night
    LIMIT $${queryParams.length};
  `;

  return pool.query(queryString, queryParams)
    .then((res) => res.rows)
    .catch((err) => {
      console.error('Error fetching properties:', err);
      return [];
    });
};


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  // Destructure the property object to ensure all the necessary fields are available
  const {
    owner_id, 
    title, 
    description, 
    thumbnail_photo_url, 
    cover_photo_url, 
    cost_per_night, 
    street, 
    city, 
    province, 
    post_code, 
    country, 
    parking_spaces, 
    number_of_bathrooms, 
    number_of_bedrooms
  } = property;

  // Prepare the query string and values for the insertion
  const queryString = `
    INSERT INTO properties (
      owner_id, title, description, thumbnail_photo_url, cover_photo_url, 
      cost_per_night, street, city, province, post_code, country, 
      parking_spaces, number_of_bathrooms, number_of_bedrooms
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *;
  `;

  const values = [
    owner_id, title, description, thumbnail_photo_url, cover_photo_url, 
    cost_per_night, street, city, province, post_code, country, 
    parking_spaces, number_of_bathrooms, number_of_bedrooms
  ];

  return pool.query(queryString, values)
    .then(res => {
      return res.rows[0] || null;
    })
    .catch(err => {
      console.error('Error adding property:', err);
      return null;
    });
}

// Export your functions
module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
