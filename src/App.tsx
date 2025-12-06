import './App.css'
import { type CSSProperties, useState, useEffect } from 'react'

type AuthView = 'login' | 'register' | 'dashboard'
type DashboardView = 'call' | 'signals'

type Lead = {
  name: string
  number: string
  intent: 'High Intent' | 'Medium Intent' | 'Low Intent'
  date: string
}

type SimpleLead = {
  name: string
  number: string
}

const intentTone: Record<Lead['intent'], 'positive' | 'neutral' | 'low'> = {
  'High Intent': 'positive',
  'Medium Intent': 'neutral',
  'Low Intent': 'low'
}

function App() {
  const [view, setView] = useState<AuthView>('login')
  const [dashboardView, setDashboardView] = useState<DashboardView>('call')

  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const [leadData, setLeadData] = useState<Lead[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Call page state
  const [callName, setCallName] = useState('')
  const [callNumber, setCallNumber] = useState('')
  const [simpleLeads, setSimpleLeads] = useState<SimpleLead[]>([])

  const isLogin = view === 'login'


  useEffect(() => {
  const fetchSimpleLeads = async () => {
    setLoading(true)
    setError("")

    try {
      const token = localStorage.getItem("token")

      const res = await fetch("https://call-center-backend-5yvd.onrender.com/airtable/getclients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          auth: `Bearer ${token}`
        },
        body: JSON.stringify({}) // يمكن تركها فارغة إذا لا تحتاج بيانات إضافية
      })

      if (res.status === 401) {
        localStorage.removeItem("token")
        setView("login")
        return
      }

      const data = await res.json()
      
      type AirtableRecord = {
  id: string
  createdTime: string
  fields: {
    Name: string
    Number: string
    Intent: 'High Intent' | 'Medium Intent' | 'Low Intent'
    Date?: string
  }
}
      
      // حول البيانات إلى صيغة SimpleLead
      const leads: SimpleLead[] = (data.records || []).map((r: AirtableRecord) => ({
        name: r.fields.Name,
        number: r.fields.Number
      }))

      setSimpleLeads(leads)
    } catch (err) {
      console.error("Error fetching simple leads:", err)
      setError("Failed to load leads.")
    } finally {
      setLoading(false)
    }
  }

  // استدعي الدالة عند دخول dashboard & call page
  if (view === "dashboard" && dashboardView === "call") {
    fetchSimpleLeads()
  }
}, [view, dashboardView])
  // Auto-login if token exists
  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) {
      setView("dashboard")
    }
  }, [])

  // REGISTER
const handleRegister = async () => {
  setError('') // امسح أي خطأ سابق

  if (!email || !password || !name) {
    setError('You must fill all fields')
    return
  }

  if (password !== confirm) {
    setError('Passwords do not match')
    return
  }

  try {
    const res = await fetch('https://call-center-backend-5yvd.onrender.com/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_name: name,
        email,
        password
      })
    })

    const data = await res.json()
    console.log("REGISTER RESPONSE:", data)

    if (res.ok && data?.session?.access_token) {
      localStorage.setItem("token", data.session.access_token)
      setView('dashboard')
    } else {
      setError(data?.detail || 'Registration failed') // عرض الخطأ من backend
    }
  } catch (err: any) {
    console.error('Register error:', err)
    setError(err.message || 'Network error')
  }
}



  // LOGIN
  const handleLogin = async () => {
    if (!email || !password) {
      console.log('You must fill the fields')
      return
    }
    
    try {
      const res = await fetch('https://call-center-backend-5yvd.onrender.com/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
    
      const data = await res.json()
      console.log("LOGIN RESPONSE:", data)
    
      if (data?.session?.access_token) {
        localStorage.setItem("token", data.session.access_token)
        setView('dashboard')
      } else {
        console.log("Invalid login")
      }
    } catch (err) {
      console.error('Login error:', err)
    }

    setView('dashboard')
  }

  // Fetch Airtable leads from backend
  const fetchLeadsFromBackend = async () => {
    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem("token")

      const res = await fetch('https://call-center-backend-5yvd.onrender.com/airtable', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          auth: `Bearer ${token}` 
        },
        body: JSON.stringify({})
      })

      if (res.status === 401) {
        localStorage.removeItem("token")
        setView("login")
        return
      }

      const data = await res.json()
      type AirtableRecord = {
  id: string
  createdTime: string
  fields: {
    Name: string
    Number: string
    Intent: 'High Intent' | 'Medium Intent' | 'Low Intent'
    Date?: string
  }
}
      const leads: Lead[] = (data.records || []).map((r: AirtableRecord) => ({
        name: r.fields.Name,
        number: r.fields.Number,
        intent: r.fields.Intent,
        date: r.fields.Date || new Date(r.createdTime).toLocaleDateString()
      }))

      setLeadData(leads)
    } catch (err) {
      console.error('Error fetching leads:', err)
      setError('Failed to load leads.')
    } finally {
      setLoading(false)
    }
  }

  // Load leads when dashboard appears
  useEffect(() => {
    if (view === 'dashboard' && dashboardView === 'signals') {
      fetchLeadsFromBackend()
    }
  }, [view, dashboardView])

  // Add new simple lead (name + number only)
const handleAddSimpleLead = async () => {
  if (!callName.trim() || !callNumber.trim()) return;

  const next: SimpleLead = {
    name: callName.trim(),
    number: callNumber.trim(),
  };

  // أرسل البيانات للـ backend
  try {
    const res = await fetch("https://call-center-backend-5yvd.onrender.com/airtable/save_clients", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(next),
    });

    const data = await res.json();
    console.log("Response from backend:", data);
  } catch (err) {
    console.error("Error saving lead:", err);
  }

  // حدث الـ state
  setSimpleLeads((prev) => [next, ...prev]);
  setCallName("");
  setCallNumber("");
};

  // Placeholder call handlers (later connect to real telephony)
 
    const handleCallLead = async (lead: SimpleLead) => {
  console.log("Calling lead:", lead);

  try {
    const res = await fetch("https://n8n.srv1004057.hstgr.cloud/webhook/calling", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(lead), // إرسال بيانات lead كما هي
    });

    const data = await res.json();
    console.log("Response from n8n:", data);
  } catch (err) {
    console.error("Error calling lead:", err);
  }
};
 

  const handleCallAll = () => {
    console.log('Calling all leads:', simpleLeads)
  }

  // Optional: CSV upload for bulk numbers (simple name,number per line)
  // Temporarily disabled per request
  // const handleCsvUpload = (event: ChangeEvent<HTMLInputElement>) => {
  //   const file = event.target.files?.[0]
  //   if (!file) return
  //
  //   const reader = new FileReader()
  //
  //   reader.onload = () => {
  //     const text = String(reader.result ?? '')
  //     const rows = text
  //       .split(/\r?\n/)
  //       .map((row) => row.trim())
  //       .filter(Boolean)
  //
  //     const imported: SimpleLead[] = []
  //
  //     rows.forEach((row, index) => {
  //       const [rawName, rawNumber] = row.split(',').map((cell) => cell.trim())
  //       if (!rawName || !rawNumber) return
  //
  //       // Skip header row if exists
  //       if (
  //         index === 0 &&
  //         rawName.toLowerCase() === 'name' &&
  //         rawNumber.toLowerCase().includes('number')
  //       ) {
  //         return
  //       }
  //
  //       imported.push({ name: rawName, number: rawNumber })
  //     })
  //
  //     if (imported.length) {
  //       setSimpleLeads((prev) => [...imported, ...prev])
  //     }
  //   }
  //
  //   reader.readAsText(file)
  //   // allow choosing same file again
  //   event.target.value = ''
  // }

  // DASHBOARD VIEW
  if (view === 'dashboard') {
    return (
      <div className="dashboard-root table-focused">
        <header className="dashboard-header">
          <div className="brand-logo-row">
            <img src="/zuccess-logo.png" alt="Zuccess logo" className="brand-logo" />
            <span className="brand-name">Zuccess</span>
          </div>

          <button
            className="ghost-btn"
            onClick={() => {
              localStorage.removeItem("token")
              setView("login")
            }}
          >
            Sign out
          </button>
        </header>

        <div className="dashboard-tabs">
          <button
            className={`tab-btn ${dashboardView === 'call' ? 'active' : ''}`}
            onClick={() => setDashboardView('call')}
          >
            Call page
          </button>
          <button
            className={`tab-btn ${dashboardView === 'signals' ? 'active' : ''}`}
            onClick={() => setDashboardView('signals')}
          >
            Latest signals
          </button>
        </div>

        {dashboardView === 'call' && (
          <>
            {/* Call page: form + table */}
            <section className="dashboard-card quick-lead-card">
              <div className="table-header">
                <div>
                  <h2>Add new number</h2>
                  <p>Enter a name and phone number, then call them directly.</p>
                </div>
              </div>

              <div className="quick-lead-form">
                <div className="field">
                  <label>Full name</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={callName}
                    onChange={(e) => setCallName(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Phone number</label>
                  <input
                    type="tel"
                    placeholder="+966 5x xxx xxxx"
                    value={callNumber}
                    onChange={(e) => setCallNumber(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleAddSimpleLead}
                >
                  Save
                </button>
              </div>
            </section>

            {/* CSV upload (disabled for now)
            <section className="dashboard-card csv-card">
              <div className="table-header">
                <div>
                  <h2>Import from CSV</h2>
                  <p>Upload a CSV file with two columns: name,number.</p>
                </div>
              </div>
              <div className="csv-upload-row">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                />
                <span className="csv-hint">Example row: Adnan,+9705xxxxxxx</span>
              </div>
            </section>
            */}

            <section className="dashboard-card data-table">
              <div className="table-header">
                <div>
                  <h2>Saved numbers</h2>
                  <p>Numbers added manually or via CSV. Name and phone only.</p>
                </div>
              </div>

              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Number</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {simpleLeads.map((lead, index) => (
                      <tr
                        className="table-row"
                        key={lead.number + index}
                        style={{ '--row-index': index } as CSSProperties}
                      >
                        <td>
                          <strong>{lead.name}</strong>
                        </td>
                        <td>
                          <span className="muted">{lead.number}</span>
                        </td>
                        <td className="call-cell">
                          <button
                            type="button"
                            className="ghost-btn small"
                            onClick={() => handleCallLead(lead)}
                          >
                            Call
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {simpleLeads.length > 0 && (
                <div className="call-all-row">
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={handleCallAll}
                  >
                    Call all
                  </button>
                </div>
              )}
            </section>
          </>
        )}

        {dashboardView === 'signals' && (
          <section className="dashboard-card data-table full">
            <div className="table-header">
              <div>
                <h2>Latest signals</h2>
                <p>Names, numbers, intent, and timestamps at a glance.</p>
              </div>
            </div>

            <div className="table-scroll">
              {loading && <p>Loading leads...</p>}
              {error && <p className="error-text">{error}</p>}

              {!loading && !error && (
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Number</th>
                      <th>Intent</th>
                      <th>Date</th>
                    </tr>
                  </thead>

                  <tbody>
                    {leadData.map((lead, index) => (
                      <tr
                        className="table-row"
                        key={lead.name + index}
                        style={{ '--row-index': index } as CSSProperties}
                      >
                        <td>
                          <div className="person-cell">
                            <div className="avatar-ring">
                              {lead.name.split(' ').map(s => s[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                              <strong>{lead.name}</strong>
                              <span>Lead</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="muted">{lead.number}</span>
                        </td>

                        <td>
                          <span className={`intent-chip intent-${intentTone[lead.intent]}`}>
                            {lead.intent}
                          </span>
                        </td>

                        <td>
                          <span className="muted">{lead.date}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}
      </div>
    )
  }

  // LOGIN + REGISTER PAGE
  return (
    <div className="app-root">
      <div className="brand-side">
        <div className="brand-overlay" />
        <div className="brand-content">
          <div className="brand-logo-row">
            <img src="/zuccess-logo.png" alt="Zuccess logo" className="brand-logo" />
            <span className="brand-name">Zuccess</span>
          </div>
          <h1 className="brand-headline">
            Welcome to <span className="brand-glow-word">Zuccess</span> Dashboard
          </h1>
          <p className="brand-subtitle">Where creativity meets intelligent technology.</p>
        </div>
      </div>

      <div className="auth-side">
        <div className="auth-shell">
          <div className="auth-toggle">
            <button
              className={`toggle-btn ${isLogin ? 'active' : ''}`}
              onClick={() => setView('login')}
            >
              Login
            </button>
            <button
              className={`toggle-btn ${!isLogin ? 'active' : ''}`}
              onClick={() => setView('register')}
            >
              Register
            </button>

            <div className={`toggle-indicator ${isLogin ? 'left' : 'right'}`} />
          </div>

          <div className="auth-forms">
            {/* LOGIN PANEL */}
            <div className={`auth-form-panel ${isLogin ? 'panel-active' : 'panel-inactive-left'}`}>
              <h2 className="auth-title">Sign in to Zuccess</h2>

              <form
                className="auth-form"
                onSubmit={e => {
                  e.preventDefault()
                  handleLogin()
                }}
              >
                <div className="field">
                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>Password</label>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>

                <button type="submit" className="primary-btn">
                  Continue
                </button>
              </form>
            </div>

            {/* REGISTER PANEL */}
            <div className={`auth-form-panel ${!isLogin ? 'panel-active' : 'panel-inactive-right'}`}>
              <h2 className="auth-title">Create your account</h2>

              <form
                className="auth-form"
                onSubmit={e => {
                  e.preventDefault()
                  handleRegister()
                }}
              >
                <div className="field">
                  <label>Full name</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>

                <div className="field-row">
                  <div className="field">
                    <label>Password</label>
                    <input
                      type="password"
                      placeholder="Create a password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label>Confirm password</label>
                    <input
                      type="password"
                      placeholder="Repeat your password"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" className="primary-btn">
                  Create account
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
