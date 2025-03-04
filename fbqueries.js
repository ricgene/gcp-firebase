import { 
    getFirestore, 
    collection, 
    getDocs, 
    query, 
    where, 
    orderBy, 
    limit,
    doc,
    getDoc 
  } from 'firebase/firestore';
  
  // Get all users
  async function getAllUsers() {
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const users = [];
      querySnapshot.forEach((doc) => {
        users.push({
          id: doc.id,
          ...doc.data()
        });
      });
      return users;
    } catch (error) {
      console.error("Error getting users: ", error);
      throw error;
    }
  }
  
  // Get a single user by ID
  async function getUserById(userId) {
    try {
      const docRef = doc(db, "users", userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      } else {
        console.log("No such document!");
        return null;
      }
    } catch (error) {
      console.error("Error getting user: ", error);
      throw error;
    }
  }
  
  // Query users by status
  async function getUsersByStatus(status) {
    try {
      const q = query(
        collection(db, "users"),
        where("status", "==", status)
      );
      
      const querySnapshot = await getDocs(q);
      const users = [];
      querySnapshot.forEach((doc) => {
        users.push({
          id: doc.id,
          ...doc.data()
        });
      });
      return users;
    } catch (error) {
      console.error("Error querying users by status: ", error);
      throw error;
    }
  }
  
  // Get users with complex query (multiple conditions)
  async function getFilteredUsers(options = {}) {
    try {
      let q = collection(db, "users");
      const conditions = [];
      
      // Add filters based on options
      if (options.status) {
        conditions.push(where("status", "==", options.status));
      }
      
      if (options.email) {
        conditions.push(where("email", "==", options.email));
      }
      
      // Add ordering if specified
      if (options.orderByField) {
        conditions.push(orderBy(options.orderByField, options.orderDirection || 'asc'));
      }
      
      // Add limit if specified
      if (options.limit) {
        conditions.push(limit(options.limit));
      }
      
      // Apply all conditions to query
      if (conditions.length > 0) {
        q = query(q, ...conditions);
      }
      
      const querySnapshot = await getDocs(q);
      const users = [];
      querySnapshot.forEach((doc) => {
        users.push({
          id: doc.id,
          ...doc.data()
        });
      });
      return users;
    } catch (error) {
      console.error("Error getting filtered users: ", error);
      throw error;
    }
  }
  
  // Example usage:
  // Get all users
  getAllUsers()
    .then(users => console.log("All users:", users))
    .catch(error => console.error("Error:", error));
  
  // Get specific user by ID
  getUserById("someUserId")
    .then(user => console.log("User:", user))
    .catch(error => console.error("Error:", error));
  
  // Get users by status
  getUsersByStatus("inactive")
    .then(users => console.log("Inactive users:", users))
    .catch(error => console.error("Error:", error));
  
  // Get filtered users with multiple conditions
  const queryOptions = {
    status: "active",
    orderByField: "createdAt",
    orderDirection: "desc",
    limit: 10
  };
  
  getFilteredUsers(queryOptions)
    .then(users => console.log("Filtered users:", users))
    .catch(error => console.error("Error:", error));