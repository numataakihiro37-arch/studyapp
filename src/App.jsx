import { useState, useEffect, useCallback } from "react";

// ============================================================
// ⚙️ SUPABASE設定 - ここに自分のSupabase URLとAnon Keyを入力
// ============================================================
const SUPABASE_URL = "https://znfqsihxmjpodwzfbmns.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuZnFzaWh4bWpwb2R3emZibW5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2ODIzNjAsImV4cCI6MjA5NDI1ODM2MH0.w8gUUNkCwjDqdiwzIcsNu0RnR0wvHjBQxRT_0N3ocyw";

async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation",
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

// ============================================================
// UI部品
// ============================================================
function ProgressBar({ value, max, color = "#4f8ef7" }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ background: "#e8edf5", borderRadius: 99, height: 10, overflow: "hidden", flex: 1 }}>
      <div style={{
        width: `${pct}%`, height: "100%", background: color,
        borderRadius: 99, transition: "width 0.5s cubic-bezier(.4,0,.2,1)",
      }} />
    </div>
  );
}

function Badge({ children, color }) {
  return (
    <span style={{
      background: color + "22", color, borderRadius: 99,
      fontSize: 11, fontWeight: 700, padding: "2px 10px", letterSpacing: 0.5,
    }}>{children}</span>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 16,
      boxShadow: "0 2px 12px #1a2a4a10",
      padding: "20px 24px", marginBottom: 16, ...style,
    }}>{children}</div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 13, fontWeight: 800, color: "#8fa0b8",
      letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14,
    }}>{children}</div>
  );
}

const inputStyle = {
  padding: "10px 14px", borderRadius: 10, border: "1px solid #e4eaf5",
  fontSize: 14, outline: "none", background: "#f8faff",
  width: "100%", boxSizing: "border-box",
};

const primaryBtn = {
  background: "#4f8ef7", color: "#fff", border: "none", borderRadius: 10,
  padding: "10px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%",
};

const ghostBtn = {
  background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: "4px", opacity: 0.5,
};

// ============================================================
// 生徒画面 /student
// ============================================================
function StudentView() {
  const [books, setBooks] = useState([]);
  const [homeworks, setHomeworks] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookForm, setBookForm] = useState({ title: "", total_pages: "", current_page: "" });
  const [hwForm, setHwForm] = useState({ title: "", subject: "", due_date: "" });
  const [tab, setTab] = useState("books");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, h, t] = await Promise.all([
        sbFetch("books?order=created_at.asc"),
        sbFetch("homeworks?order=created_at.asc"),
        sbFetch("tasks?order=created_at.desc&limit=5"),
      ]);
      setBooks(b); setHomeworks(h); setTasks(t);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addBook = async () => {
    if (!bookForm.title || !bookForm.total_pages) return;
    await sbFetch("books", {
      method: "POST",
      body: JSON.stringify({
        title: bookForm.title,
        total_pages: Number(bookForm.total_pages),
        current_page: Number(bookForm.current_page) || 0,
      }),
    });
    setBookForm({ title: "", total_pages: "", current_page: "" });
    load();
  };

  const updateBookPage = async (id, current_page) => {
    await sbFetch(`books?id=eq.${id}`, {
      method: "PATCH",
      body: JSON.stringify({ current_page: Number(current_page) }),
    });
    load();
  };

  const deleteBook = async (id) => {
    await sbFetch(`books?id=eq.${id}`, { method: "DELETE", prefer: "" });
    load();
  };

  const addHomework = async () => {
    if (!hwForm.title) return;
    await sbFetch("homeworks", {
      method: "POST",
      body: JSON.stringify({ ...hwForm, done: false }),
    });
    setHwForm({ title: "", subject: "", due_date: "" });
    load();
  };

  const toggleHomework = async (hw) => {
    await sbFetch(`homeworks?id=eq.${hw.id}`, {
      method: "PATCH",
      body: JSON.stringify({ done: !hw.done }),
    });
    load();
  };

  const deleteHomework = async (id) => {
    await sbFetch(`homeworks?id=eq.${id}`, { method: "DELETE", prefer: "" });
    load();
  };

  const completedBooks = books.filter(b => b.current_page >= b.total_pages).length;
  const completedHw = homeworks.filter(h => h.done).length;
  const total = books.length + homeworks.length;
  const completed = completedBooks + completedHw;
  const overallPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const tabs = [
    { id: "books", label: "📚 教科書" },
    { id: "homework", label: "📝 宿題" },
    { id: "tasks", label: "📋 次のタスク" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%)", fontFamily: "'Hiragino Sans','Noto Sans JP',sans-serif", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e4eaf5", padding: "18px 24px 14px", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 2px 12px #1a2a4a08" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#1a2a4a", letterSpacing: -0.5 }}>StudyTrack</div>
              <div style={{ fontSize: 12, color: "#8fa0b8", marginTop: 1 }}>今日もコツコツ積み上げよう 💪</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#4f8ef7" }}>{overallPct}%</div>
              <div style={{ fontSize: 10, color: "#8fa0b8" }}>全体達成率</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ProgressBar value={completed} max={total} color="#4f8ef7" />
            <span style={{ fontSize: 11, color: "#8fa0b8", whiteSpace: "nowrap" }}>{completed}/{total} 完了</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 16px 0" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#8fa0b8" }}>読み込み中…</div>
        ) : (
          <>
            {/* タブ */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  flex: 1, padding: "10px 4px", borderRadius: 12, border: "none",
                  fontWeight: tab === t.id ? 800 : 600, fontSize: 12, cursor: "pointer",
                  background: tab === t.id ? "#4f8ef7" : "#fff",
                  color: tab === t.id ? "#fff" : "#8fa0b8",
                  boxShadow: tab === t.id ? "0 4px 12px #4f8ef730" : "none",
                  transition: "all 0.2s",
                }}>{t.label}</button>
              ))}
            </div>

            {/* 教科書タブ */}
            {tab === "books" && (
              <>
                <Card>
                  <SectionTitle>📚 教科書・参考書を追加</SectionTitle>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <input placeholder="教科書名（例：数学IA）" value={bookForm.title} onChange={e => setBookForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <input placeholder="総ページ数" type="number" value={bookForm.total_pages} onChange={e => setBookForm(f => ({ ...f, total_pages: e.target.value }))} style={{ ...inputStyle, flex: 1 }} />
                      <input placeholder="現在のページ" type="number" value={bookForm.current_page} onChange={e => setBookForm(f => ({ ...f, current_page: e.target.value }))} style={{ ...inputStyle, flex: 1 }} />
                    </div>
                    <button onClick={addBook} style={primaryBtn}>＋ 追加</button>
                  </div>
                </Card>
                {books.length === 0 && <div style={{ textAlign: "center", color: "#b0bec5", padding: "30px 0", fontSize: 14 }}>教科書・参考書を追加しましょう 📖</div>}
                {books.map(book => {
                  const pct = book.total_pages > 0 ? Math.round((book.current_page / book.total_pages) * 100) : 0;
                  return (
                    <Card key={book.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 16, color: "#1a2a4a" }}>{book.title}</div>
                          <div style={{ fontSize: 12, color: "#8fa0b8", marginTop: 2 }}>{book.current_page} / {book.total_pages} ページ</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Badge color={pct >= 100 ? "#43a047" : "#4f8ef7"}>{pct}%</Badge>
                          <button onClick={() => deleteBook(book.id)} style={ghostBtn}>🗑</button>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <ProgressBar value={book.current_page} max={book.total_pages} color={pct >= 100 ? "#43a047" : "#4f8ef7"} />
                      </div>
                      {pct < 100 ? (
                        <div style={{ display: "flex", gap: 8 }}>
                          <input type="number" placeholder="ページを更新" min={0} max={book.total_pages} defaultValue={book.current_page} id={`page-${book.id}`} style={{ ...inputStyle, flex: 1, fontSize: 13 }} />
                          <button onClick={() => { const v = document.getElementById(`page-${book.id}`).value; updateBookPage(book.id, v); }} style={{ ...primaryBtn, width: "auto", padding: "8px 14px", fontSize: 13 }}>更新</button>
                        </div>
                      ) : (
                        <div style={{ color: "#43a047", fontWeight: 800, fontSize: 14, textAlign: "center" }}>✅ 完了！お疲れ様！</div>
                      )}
                    </Card>
                  );
                })}
              </>
            )}

            {/* 宿題タブ */}
            {tab === "homework" && (
              <>
                <Card>
                  <SectionTitle>📝 宿題・課題を追加</SectionTitle>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <input placeholder="課題名（例：英語 長文読解）" value={hwForm.title} onChange={e => setHwForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <input placeholder="教科" value={hwForm.subject} onChange={e => setHwForm(f => ({ ...f, subject: e.target.value }))} style={{ ...inputStyle, flex: 1 }} />
                      <input type="date" value={hwForm.due_date} onChange={e => setHwForm(f => ({ ...f, due_date: e.target.value }))} style={{ ...inputStyle, flex: 1 }} />
                    </div>
                    <button onClick={addHomework} style={primaryBtn}>＋ 追加</button>
                  </div>
                </Card>
                {homeworks.length === 0 && <div style={{ textAlign: "center", color: "#b0bec5", padding: "30px 0", fontSize: 14 }}>宿題・課題を追加しましょう ✏️</div>}
                {homeworks.filter(h => !h.done).map(hw => (
                  <Card key={hw.id}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <button onClick={() => toggleHomework(hw)} style={{ width: 28, height: 28, borderRadius: 8, border: "2px solid #4f8ef7", background: "#fff", cursor: "pointer", flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "#1a2a4a" }}>{hw.title}</div>
                        <div style={{ fontSize: 12, color: "#8fa0b8", marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {hw.subject && <Badge color="#7c4dff">{hw.subject}</Badge>}
                          {hw.due_date && <span>📅 {hw.due_date}</span>}
                        </div>
                      </div>
                      <button onClick={() => deleteHomework(hw.id)} style={ghostBtn}>🗑</button>
                    </div>
                  </Card>
                ))}
                {homeworks.filter(h => h.done).length > 0 && (
                  <>
                    <div style={{ fontSize: 12, color: "#8fa0b8", fontWeight: 700, margin: "8px 0 8px 4px" }}>✅ 完了済み</div>
                    {homeworks.filter(h => h.done).map(hw => (
                      <Card key={hw.id} style={{ opacity: 0.6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <button onClick={() => toggleHomework(hw)} style={{ width: 28, height: 28, borderRadius: 8, border: "2px solid #43a047", background: "#43a047", cursor: "pointer", flexShrink: 0, color: "#fff", fontSize: 16 }}>✓</button>
                          <div style={{ fontWeight: 700, fontSize: 15, color: "#8fa0b8", textDecoration: "line-through" }}>{hw.title}</div>
                          <button onClick={() => deleteHomework(hw.id)} style={ghostBtn}>🗑</button>
                        </div>
                      </Card>
                    ))}
                  </>
                )}
              </>
            )}

            {/* 次のタスクタブ */}
            {tab === "tasks" && (
              <>
                <div style={{ fontSize: 13, color: "#8fa0b8", marginBottom: 12, lineHeight: 1.6 }}>
                  先生からの次のタスク指示です。
                </div>
                {tasks.length === 0 ? (
                  <Card style={{ textAlign: "center", padding: "30px 24px" }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
                    <div style={{ color: "#8fa0b8", fontSize: 14 }}>まだタスクの指示はありません。<br />先生からの指示をお待ちください。</div>
                  </Card>
                ) : (
                  tasks.map((task, i) => (
                    <Card key={task.id} style={{ borderLeft: "4px solid #4f8ef7" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <Badge color="#4f8ef7">タスク {i + 1}</Badge>
                        <span style={{ fontSize: 11, color: "#b0bec5" }}>{task.created_at ? new Date(task.created_at).toLocaleDateString("ja-JP") : ""}</span>
                      </div>
                      <div style={{ fontSize: 15, color: "#1a2a4a", lineHeight: 1.7, whiteSpace: "pre-wrap", marginTop: 6 }}>{task.content}</div>
                    </Card>
                  ))
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 先生画面 /teacher
// ============================================================
function TeacherView() {
  const [books, setBooks] = useState([]);
  const [homeworks, setHomeworks] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState("");
  const [posting, setPosting] = useState(false);
  const [tab, setTab] = useState("overview");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, h, t] = await Promise.all([
        sbFetch("books?order=created_at.asc"),
        sbFetch("homeworks?order=created_at.asc"),
        sbFetch("tasks?order=created_at.desc"),
      ]);
      setBooks(b); setHomeworks(h); setTasks(t);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const postTask = async () => {
    if (!newTask.trim()) return;
    setPosting(true);
    await sbFetch("tasks", {
      method: "POST",
      body: JSON.stringify({ content: newTask.trim() }),
    });
    setNewTask("");
    await load();
    setPosting(false);
  };

  const deleteTask = async (id) => {
    await sbFetch(`tasks?id=eq.${id}`, { method: "DELETE", prefer: "" });
    load();
  };

  const completedBooks = books.filter(b => b.current_page >= b.total_pages).length;
  const completedHw = homeworks.filter(h => h.done).length;
  const total = books.length + homeworks.length;
  const completed = completedBooks + completedHw;
  const overallPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const tabs = [
    { id: "overview", label: "📊 進捗確認" },
    { id: "tasks", label: "📋 タスク指示" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #fff8f0 0%, #ffeedd 100%)", fontFamily: "'Hiragino Sans','Noto Sans JP',sans-serif", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #f5e4d0", padding: "18px 24px 14px", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 2px 12px #4a2a1a08" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#2a1a0a", letterSpacing: -0.5 }}>StudyTrack <span style={{ fontSize: 13, color: "#e07830", fontWeight: 700 }}>先生用</span></div>
              <div style={{ fontSize: 12, color: "#b08060", marginTop: 1 }}>生徒の進捗を確認・指示しましょう</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#e07830" }}>{overallPct}%</div>
              <div style={{ fontSize: 10, color: "#b08060" }}>全体達成率</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ProgressBar value={completed} max={total} color="#e07830" />
            <span style={{ fontSize: 11, color: "#b08060", whiteSpace: "nowrap" }}>{completed}/{total} 完了</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 16px 0" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#b08060" }}>読み込み中…</div>
        ) : (
          <>
            {/* タブ */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  flex: 1, padding: "10px 4px", borderRadius: 12, border: "none",
                  fontWeight: tab === t.id ? 800 : 600, fontSize: 13, cursor: "pointer",
                  background: tab === t.id ? "#e07830" : "#fff",
                  color: tab === t.id ? "#fff" : "#b08060",
                  boxShadow: tab === t.id ? "0 4px 12px #e0783030" : "none",
                  transition: "all 0.2s",
                }}>{t.label}</button>
              ))}
            </div>

            {/* 進捗確認タブ */}
            {tab === "overview" && (
              <>
                {/* サマリー */}
                <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                  {[
                    { label: "教科書", val: `${completedBooks}/${books.length}`, color: "#4f8ef7" },
                    { label: "宿題", val: `${completedHw}/${homeworks.length}`, color: "#7c4dff" },
                    { label: "達成率", val: `${overallPct}%`, color: "#e07830" },
                  ].map(s => (
                    <div key={s.label} style={{ flex: 1, background: "#fff", borderRadius: 14, padding: "14px", textAlign: "center", boxShadow: "0 2px 8px #1a2a4a08" }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.val}</div>
                      <div style={{ fontSize: 11, color: "#b08060", marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* 教科書一覧 */}
                <Card>
                  <SectionTitle>📚 教科書・参考書の進捗</SectionTitle>
                  {books.length === 0 ? (
                    <div style={{ color: "#b0bec5", fontSize: 13 }}>まだ登録なし</div>
                  ) : books.map(book => {
                    const pct = book.total_pages > 0 ? Math.round((book.current_page / book.total_pages) * 100) : 0;
                    return (
                      <div key={book.id} style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: "#1a2a4a" }}>{book.title}</span>
                          <Badge color={pct >= 100 ? "#43a047" : "#4f8ef7"}>{pct}%</Badge>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <ProgressBar value={book.current_page} max={book.total_pages} color={pct >= 100 ? "#43a047" : "#4f8ef7"} />
                          <span style={{ fontSize: 11, color: "#8fa0b8", whiteSpace: "nowrap" }}>{book.current_page}/{book.total_pages}p</span>
                        </div>
                      </div>
                    );
                  })}
                </Card>

                {/* 宿題一覧 */}
                <Card>
                  <SectionTitle>📝 宿題・課題の状況</SectionTitle>
                  {homeworks.length === 0 ? (
                    <div style={{ color: "#b0bec5", fontSize: 13 }}>まだ登録なし</div>
                  ) : homeworks.map(hw => (
                    <div key={hw.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 18 }}>{hw.done ? "✅" : "⬜"}</span>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: hw.done ? "#8fa0b8" : "#1a2a4a", textDecoration: hw.done ? "line-through" : "none" }}>{hw.title}</span>
                        <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                          {hw.subject && <Badge color="#7c4dff">{hw.subject}</Badge>}
                          {hw.due_date && <span style={{ fontSize: 11, color: "#8fa0b8" }}>📅 {hw.due_date}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </Card>
              </>
            )}

            {/* タスク指示タブ */}
            {tab === "tasks" && (
              <>
                <Card>
                  <SectionTitle>✏️ 次のタスクを指示する</SectionTitle>
                  <textarea
                    placeholder="例：数学IAのp.50〜60を次回までに終わらせてください。特に三角関数の問題を重点的に。"
                    value={newTask}
                    onChange={e => setNewTask(e.target.value)}
                    rows={4}
                    style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7 }}
                  />
                  <button
                    onClick={postTask}
                    disabled={posting || !newTask.trim()}
                    style={{ ...primaryBtn, marginTop: 10, background: "#e07830", opacity: (posting || !newTask.trim()) ? 0.5 : 1 }}
                  >{posting ? "送信中…" : "📨 タスクを送る"}</button>
                </Card>

                <SectionTitle>📋 送信済みタスク履歴</SectionTitle>
                {tasks.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#b0bec5", padding: "20px 0", fontSize: 14 }}>まだタスクを送っていません</div>
                ) : tasks.map((task, i) => (
                  <Card key={task.id} style={{ borderLeft: "4px solid #e07830" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <Badge color="#e07830">タスク {tasks.length - i}</Badge>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: "#b0bec5" }}>{task.created_at ? new Date(task.created_at).toLocaleDateString("ja-JP") : ""}</span>
                        <button onClick={() => deleteTask(task.id)} style={ghostBtn}>🗑</button>
                      </div>
                    </div>
                    <div style={{ fontSize: 14, color: "#2a1a0a", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{task.content}</div>
                  </Card>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// ルーティング
// ============================================================
export default function App() {
  const path = window.location.pathname;
  if (path.includes("teacher")) return <TeacherView />;
  return <StudentView />;
}
