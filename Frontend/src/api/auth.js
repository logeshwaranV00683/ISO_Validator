import apiClient, { unwrap } from "./apiClient";


// POST /auth/login
export const login = async (username, password) => {
  const res = await apiClient.post("/auth/login", { username, password });
  return unwrap(res);
  // returns: { token, tokenType, expiresAt,
  //   user: { userId, username, fullName, email, avatarInitials, role, permissions } }
};


// export const login = async (username, password) => {
//   // Temp mock — backend ready-ஆனா இதை remove பண்ணு
//   const users = {
//     admin:   { userId:1, username:"admin",   fullName:"John Doe",   role:"ADMIN",   avatarInitials:"JD" },
//     analyst: { userId:2, username:"analyst", fullName:"Priya Singh", role:"ANALYST", avatarInitials:"PS" },
//     viewer:  { userId:3, username:"viewer",  fullName:"Alex Tan",   role:"VIEWER",  avatarInitials:"AT" },
//   };
//   const passwords = { admin:"admin123", analyst:"analyst123", viewer:"viewer123" };
  
//   await new Promise(r => setTimeout(r, 600)); // simulate delay
  
//   if (users[username] && passwords[username] === password) {
//     return { token: "mock-jwt-token", user: users[username] };
//   }
//   throw { response: { data: { error: { message: "Invalid credentials." } } } };
// };

// POST /auth/logout
export const logout = async () => {
  await apiClient.post("/auth/logout");
  localStorage.removeItem("jwt_token");
  localStorage.removeItem("user_info");
};

// PUT /auth/change-password
export const changePassword = async (currentPassword, newPassword) => {
  const res = await apiClient.put("/auth/change-password", { currentPassword, newPassword });
  return unwrap(res);
};