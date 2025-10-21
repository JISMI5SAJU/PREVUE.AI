import { createContext } from "react"

const AuthContext = createContext({
  user: null,
  handleLogin: () => {},
  handleLogout: () => {},
})

export default AuthContext
