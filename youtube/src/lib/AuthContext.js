import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { useState, createContext, useEffect, useContext } from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = (userdata) => {
    setUser(userdata);
    localStorage.setItem("user", JSON.stringify(userdata));
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem("user");

    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  const handlegooglesignin = async () => {
    try {
      console.log("1. Google login started");

      const result = await signInWithPopup(auth, provider);

      console.log("2. Firebase login successful");

      const firebaseuser = result.user;

      const payload = {
        email: firebaseuser.email,
        name: firebaseuser.displayName,
        image:
          firebaseuser.photoURL ||
          "https://github.com/shadcn.png",
      };

      console.log("3. Sending user to backend");

      const response = await axiosInstance.post(
        "/user/login",
        payload
      );

      console.log("4. Backend response:", response.data);

      login(response.data.result);
    } catch (error) {
      console.error("GOOGLE LOGIN ERROR:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseuser) => {
        if (firebaseuser) {
          try {
            const payload = {
              email: firebaseuser.email,
              name: firebaseuser.displayName,
              image:
                firebaseuser.photoURL ||
                "https://github.com/shadcn.png",
            };

            const response = await axiosInstance.post(
              "/user/login",
              payload
            );

            console.log(
              "AUTO LOGIN RESPONSE:",
              response.data
            );

            login(response.data.result);
          } catch (error) {
            console.error("AUTO LOGIN ERROR:", error);
            await logout();
          }
        }
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        login,
        logout,
        handlegooglesignin,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);