import React from "react";
import { supabase } from "./lib/supabase";
export default function MonsterHunterWildsSpeedrunHub() {
  const [activeTab, setActiveTab] = React.useState("recent");

  const [runs, setRuns] = React.useState([]);
  const [profiles, setProfiles] = React.useState([]);

  const [currentUser, setCurrentUser] = React.useState({
    username: "Guest",
    role: "user"
  });

  const [profileForm, setProfileForm] = React.useState({
    huntername: "",
    platform: "PC"
  });

  const [leaderFilters, setLeaderFilters] = React.useState({
    monster: "All",
    weapon: "All",
    ruleset: "All",
    level: "All"
  });

    
  const weaponOptions = ["Great Sword","Long Sword","Sword & Shield","Dual Blades","Hammer","Hunting Horn","Lance","Gunlance","Switch Axe","Charge Blade","Insect Glaive","Light Bowgun","Heavy Bowgun","Bow"];

  const monsterOptions = ["Arkveld","Ajarakan","Balahara","Chatacabra","Doshaguma","Hirabami","Jin Dahaad","Lala Barina","Nu Udra","Quematrice","Rey Dau","Rompopolo","Uth Duna","Xu Wu","Zoh Shia","Blangonga","Congalala","Gore Magala","Gravios","Gypceros","Lagiacrus","Mizutsune","Nerscylla","Rathalos","Rathian","Seregios","Yian Kut-Ku","Gogmazios","Omega Planetess"];

  const systemOptions = ["PC","Xbox","PS5"];

  const [form, setForm] = React.useState({ hunter:"", weapon:weaponOptions[0], monster:monsterOptions[0], system:"PC", time:"", youtube:"", level:"10★", ruleset:"TA Wiki" });

  React.useEffect(() => {
    fetchRuns();
    fetchProfiles();

    const runsChannel = supabase
      .channel("runs-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "runs" }, () => {
        fetchRuns();
      })
      .subscribe();

    const profilesChannel = supabase
      .channel("profiles-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        fetchProfiles();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(runsChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, []);

  async function fetchRuns() {
    const { data, error } = await supabase
      .from("runs")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error("Error fetching runs:", error);
      return;
    }

    setRuns(data || []);
  }

  async function fetchProfiles() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*");

    if (error) {
      console.error("Error fetching profiles:", error);
      return;
    }

    setProfiles(data || []);
  }


  async function submitRun() {
    const { error } = await supabase
      .from("runs")
      .insert({
        hunter: form.hunter,
        monster: form.monster,
        weapon: form.weapon,
        system: form.system,
        time: form.time,
        youtube: form.youtube,
        level: form.level || "10★",
        ruleset: form.ruleset,
        status: "pending"
      });

    if (error) {
      console.error("Error submitting run:", error);
      alert(`Run could not be submitted: ${error.message}`);
      return;
    }

    await fetchRuns();
    setActiveTab("recent");
  }

  async function approveRun(id) {
    const { error } = await supabase
      .from("runs")
      .update({ status: "approved" })
      .eq("id", id);

    if (error) {
      console.error("Error approving run:", error);
      alert(`Run could not be approved: ${error.message}`);
      return;
    }

    await fetchRuns();
  }

  async function rejectRun(id) {
    const { error } = await supabase
      .from("runs")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error rejecting run:", error);
      return;
    }

    fetchRuns();
  }

  async function createProfile() {
    const existingProfile = profiles.find(profile => profile.username === currentUser.username);

    if (existingProfile) {
      alert("This account already has a hunter profile.");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .insert({
        username: currentUser.username,
        huntername: profileForm.huntername,
        platform: profileForm.platform,
        role: currentRole === "admin" ? "admin" : "user"
      });

    if (error) {
      console.error("Error creating profile:", error);
      alert(`Profile could not be saved: ${error.message}`);
      return;
    }

    await fetchProfiles();
    setActiveTab("profile");
  }

  async function promoteToModerator(id) {
    if(currentRole !== "admin") return;

    const { error } = await supabase
      .from("profiles")
      .update({ role: "moderator" })
      .eq("id", id);

    if (error) {
      console.error("Error promoting moderator:", error);
      alert(`Could not update role: ${error.message}`);
      return;
    }

    await fetchProfiles();
  }

  async function removeModerator(id) {
    if(currentRole !== "admin") return;

    const { error } = await supabase
      .from("profiles")
      .update({ role: "user" })
      .eq("id", id);

    if (error) {
      console.error("Error removing moderator:", error);
      alert(`Could not update role: ${error.message}`);
      return;
    }

    await fetchProfiles();
  }

  function getMyProfile() {
    return profiles.find(profile =>
      profile.username === currentUser.username ||
      profile.huntername === currentUser.username ||
      profile.hunterName === currentUser.username
    ) || null;
  }

  const currentProfile = getMyProfile();
  const currentRole = (currentProfile?.role || currentUser.role || "user").toLowerCase();
  const canModerate = currentRole === "moderator" || currentRole === "admin";
  const canAdmin = currentRole === "admin";

  const recentRuns = runs;
  const approvedRuns = runs.filter(r => r.status === "approved");
  const pendingRuns = runs.filter(r => r.status === "pending");
  const filteredLeaderboard = approvedRuns.filter(r => (
    (leaderFilters.monster === "All" || r.monster === leaderFilters.monster) &&
    (leaderFilters.weapon === "All" || r.weapon === leaderFilters.weapon) &&
    (leaderFilters.ruleset === "All" || r.ruleset === leaderFilters.ruleset) &&
    (leaderFilters.level === "All" || r.level === leaderFilters.level)
  ));

  return (
    <>

      
    <div className="min-h-screen bg-black text-zinc-300 font-sans antialiased">

      <header className="border-b border-zinc-800 bg-zinc-950 px-6 py-5 flex flex-col gap-4">
        <div className="flex flex-col">
          <h1 className="text-4xl font-black tracking-tight text-zinc-100">
            Meli's Speedrun Leaderboards
          </h1>
          <p className="text-zinc-500 mt-1 text-sm uppercase tracking-[0.25em]">
            Monster Hunter Wilds (DLC Placeholder) Speedrunning Platform
          </p>

          <div className="mt-3 inline-flex items-center gap-2 w-fit px-4 py-2 rounded-full border border-amber-700/40 bg-amber-500/10 backdrop-blur-sm shadow-[0_0_25px_rgba(245,158,11,0.12)]">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
              Beta Version • Features & Systems are Still in Active Development
            </span>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
        <button onClick={() => setActiveTab("recent")}>Recent Runs</button>
        <button onClick={() => setActiveTab("leaderboards")}>Leaderboards</button>
        <button onClick={() => setActiveTab("submit")}>Submit Run</button>
        <button onClick={() => setActiveTab("profile")}>Profile</button>
        {canModerate && (
          <button onClick={() => setActiveTab("moderation")}>Moderation</button>
        )}

        {canAdmin && (
          <button onClick={() => setActiveTab("admin")}>Admin Panel</button>
        )}
        <button onClick={() => setActiveTab("bugs")}>Bug Reports</button>
      </div>
      </header>

      {/* RECENT */}
      {activeTab === "recent" && (
        <section className="max-w-7xl mx-auto px-6 py-10">
          <h2 className="text-3xl font-bold">Recent Runs</h2>

          <div className="mt-8 border border-zinc-800 rounded-3xl bg-zinc-950 overflow-hidden">
            <table className="w-full">
              <thead className="bg-zinc-900 text-zinc-500 text-sm uppercase">
                <tr>
                  <th className="px-6 py-4 text-left">Hunter</th>
                  <th className="px-6 py-4 text-left">Monster</th>
                  <th className="px-6 py-4 text-left">Weapon</th>
                  <th className="px-6 py-4 text-left">System</th>
                  <th className="px-6 py-4 text-left">Time</th>
                  <th className="px-6 py-4 text-left">Level</th>
                  <th className="px-6 py-4 text-left">Ruleset</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map(r => (
                  <tr key={r.id} className="border-t border-zinc-800">
                    <td className="px-6 py-4">{r.hunter}</td>
                    <td className="px-6 py-4">{r.monster}</td>
                    <td className="px-6 py-4">{r.weapon}</td>
                    <td className="px-6 py-4">{r.system}</td>
                    <td className="px-6 py-4">
                      <a
                        href={r.youtube}
                        target="_blank"
                        rel="noreferrer"
                        className="text-purple-300 hover:text-purple-200 hover:underline font-semibold"
                      >
                        {r.time}
                      </a>
                    </td>
                    <td className="px-6 py-4">{r.level}</td>
                    <td className="px-6 py-4">{r.ruleset}</td>
                  </tr>
                ))}
                {recentRuns.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-zinc-500 py-10">No runs yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* LEADERBOARDS */}
      {activeTab === "leaderboards" && (
        <section className="max-w-7xl mx-auto px-6 py-10">
          <h2 className="text-3xl font-bold">Leaderboards</h2>

          <div className="mt-4 flex flex-wrap gap-3">
            <select className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl" value={leaderFilters.monster} onChange={e => setLeaderFilters({...leaderFilters, monster:e.target.value})}>
              <option>All</option>
              {monsterOptions.map(m => <option key={m}>{m}</option>)}
            </select>

            <select className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl" value={leaderFilters.weapon} onChange={e => setLeaderFilters({...leaderFilters, weapon:e.target.value})}>
              <option>All</option>
              {weaponOptions.map(w => <option key={w}>{w}</option>)}
            </select>

            <select className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl" value={leaderFilters.ruleset} onChange={e => setLeaderFilters({...leaderFilters, ruleset:e.target.value})}>
              <option>All</option>
              <option>TA Wiki</option>
              <option>Freestyle</option>
            </select>
            
            <select className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl" value={leaderFilters.level} onChange={e => setLeaderFilters({...leaderFilters, level:e.target.value})}>
            <option>All</option>
            <option>10★</option>
            <option>9★</option>            
            <option>8★</option>
            <option>7★</option>
            <option>6★</option>
            </select>
            
          </div>

          <div className="mt-6 border border-zinc-800 rounded-3xl bg-zinc-950 overflow-hidden">
            <table className="w-full">
              <thead className="bg-zinc-900 text-zinc-500 text-sm uppercase">
                <tr>
                  <th className="px-6 py-4 text-left">Hunter</th>
                  <th className="px-6 py-4 text-left">Monster</th>
                  <th className="px-6 py-4 text-left">Weapon</th>
                  <th className="px-6 py-4 text-left">System</th>
                  <th className="px-6 py-4 text-left">Time</th>
                  <th className="px-6 py-4 text-left">Level</th>
                  <th className="px-6 py-4 text-left">Ruleset</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaderboard.map(r => (
                  <tr key={r.id} className="border-t border-zinc-800">
                    <td className="px-6 py-4">{r.hunter}</td>
                    <td className="px-6 py-4">{r.monster}</td>
                    <td className="px-6 py-4">{r.weapon}</td>
                    <td className="px-6 py-4">{r.system}</td>
                    <td className="px-6 py-4">
                      <a
                        href={r.youtube}
                        target="_blank"
                        rel="noreferrer"
                        className="text-purple-300 hover:text-purple-200 hover:underline font-semibold"
                      >
                        {r.time}
                      </a>
                    </td>
                    <td className="px-6 py-4">{r.level}</td>
                    <td className="px-6 py-4">{r.ruleset}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* MODERATION */}
      {activeTab === "moderation" && canModerate && (
        <section className="max-w-6xl mx-auto px-6 py-10">
          <h2 className="text-3xl font-bold">Moderation Panel</h2>

          <div className="mt-6 border border-zinc-800 rounded-3xl bg-zinc-950 overflow-hidden">
            <table className="w-full">
              <thead className="bg-zinc-900 text-zinc-500 text-sm uppercase">
                <tr>
                  <th className="px-6 py-4 text-left">Hunter</th>
                  <th className="px-6 py-4 text-left">Monster</th>
                  <th className="px-6 py-4 text-left">Weapon</th>
                  <th className="px-6 py-4 text-left">System</th>
                  <th className="px-6 py-4 text-left">Time</th>
                  <th className="px-6 py-4 text-left">Level</th>
                  <th className="px-6 py-4 text-left">Ruleset</th>
                  <th className="px-6 py-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingRuns.map(r => (
                  <tr key={r.id} className="border-t border-zinc-800">
                    <td className="px-6 py-4">{r.hunter}</td>
                    <td className="px-6 py-4">{r.monster}</td>
                    <td className="px-6 py-4">{r.weapon}</td>
                    <td className="px-6 py-4">{r.system}</td>
                    <td className="px-6 py-4">
                      <a
                        href={r.youtube}
                        target="_blank"
                        rel="noreferrer"
                        className="text-purple-300 hover:text-purple-200 hover:underline font-semibold"
                      >
                        {r.time}
                      </a>
                    </td>
                    <td className="px-6 py-4">{r.level}</td>
                    <td className="px-6 py-4">{r.ruleset}</td>
                    <td className="px-6 py-4 flex gap-2">
                      <button onClick={() => approveRun(r.id)} className="px-3 py-1 bg-green-700 rounded">Approve</button>
                      <button onClick={() => rejectRun(r.id)} className="px-3 py-1 bg-red-700 rounded">Reject</button>
                    </td>
                  </tr>
                ))}
                {pendingRuns.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-zinc-500 py-10">No pending runs</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* PROFILE */}
      {activeTab === "profile" && (
        <section className="max-w-4xl mx-auto px-6 py-10">
          <div className="border border-zinc-800 bg-zinc-950 rounded-3xl p-8">
            <h2 className="text-3xl font-bold mb-6 text-zinc-100">
              Hunter Profile
            </h2>

            {getMyProfile() ? (
              <div className="space-y-8">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="border border-zinc-800 rounded-2xl p-6 bg-black/40">
                    <h3 className="text-xl font-semibold text-zinc-100 mb-4">
                      Profile Information
                    </h3>

                    <div className="space-y-3 text-zinc-400">
                      <p>
                        <span className="text-zinc-500">Hunter Name:</span> {(getMyProfile().huntername || getMyProfile().hunterName)}
                      </p>

                      <p>
                        <span className="text-zinc-500">Platform:</span> {getMyProfile().platform}
                      </p>

                      <p>
                        <span className="text-zinc-500">Role:</span>
                        <span className="capitalize ml-2">{getMyProfile().role}</span>
                      </p>
                    </div>
                  </div>

                  <div className="border border-zinc-800 rounded-2xl p-6 bg-black/40">
                    <h3 className="text-xl font-semibold text-zinc-100 mb-4">
                      Previous Runs
                    </h3>

                    <div className="space-y-3">
                      {runs.filter(r => r.hunter === (getMyProfile().huntername || getMyProfile().hunterName)).length > 0 ? (
                        runs
                          .filter(r => r.hunter === (getMyProfile().huntername || getMyProfile().hunterName))
                          .map(run => (
                            <div
                              key={run.id}
                              className="border border-zinc-800 rounded-xl p-3 bg-zinc-900/50"
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-zinc-200 font-medium">
                                    {run.monster}
                                  </p>
                                  <p className="text-sm text-zinc-500">
                                    {run.weapon} • {run.ruleset}
                                  </p>
                                </div>

                                <a
                                  href={run.youtube}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-sm transition-all duration-200"
                                >
                                  ▶ {run.time}
                                </a>
                              </div>
                            </div>
                          ))
                      ) : (
                        <p className="text-zinc-500 text-sm">
                          No submitted runs yet.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <p className="text-zinc-500">
                  Create your hunter profile to begin submitting speedruns.
                </p>

                <input
                  className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl"
                  placeholder="Hunter Name"
                  value={profileForm.huntername} onChange={e => setProfileForm({...profileForm, huntername:e.target.value})}
                />

                <select
                  className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl"
                  value={profileForm.platform}
                  onChange={e => setProfileForm({...profileForm, platform:e.target.value})}
                >
                  <option value="PC">PC</option>
                  <option value="Xbox">Xbox</option>
                  <option value="PS5">PS5</option>
                </select>

                <button
                  onClick={createProfile}
                  className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-xl hover:bg-zinc-700"
                >
                  Create Profile
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ADMIN PANEL */}
      {activeTab === "admin" && canAdmin && (
        <section className="max-w-5xl mx-auto px-6 py-10">
          <div className="border border-zinc-800 bg-zinc-950 rounded-3xl p-8">
            <h2 className="text-3xl font-bold text-zinc-100 mb-6">
              Admin Control Panel
            </h2>

            <div className="grid gap-4">
              {profiles.map(profile => (
                <div
                  key={profile.id}
                  className="flex items-center justify-between border border-zinc-800 rounded-2xl p-4 bg-black/40"
                >
                  <div>
                    <p className="font-semibold text-zinc-100">
                      {(profile.huntername || profile.hunterName)}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {profile.platform} • {profile.role}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {profile.role !== "moderator" ? (
                      <button
                        onClick={() => promoteToModerator(profile.id)}
                        className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-600"
                      >
                        Make Moderator
                      </button>
                    ) : (
                      <button
                        onClick={() => removeModerator(profile.id)}
                        className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600"
                      >
                        Remove Moderator
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {profiles.length === 0 && (
                <div className="text-zinc-500 text-center py-10">
                  No users created yet.
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* BUG REPORTS */}
      {activeTab === "bugs" && (
        <section className="max-w-3xl mx-auto px-6 py-10">
          <div className="border border-zinc-800 bg-zinc-950 rounded-3xl p-8 space-y-6 shadow-[0_0_30px_rgba(255,255,255,0.03)]">
            <div>
              <h2 className="text-3xl font-bold text-zinc-100">
                Bug Reports & Feedback
              </h2>
              <p className="text-zinc-500 mt-3 leading-relaxed">
                Found a bug, leaderboard issue, broken submission, or UI problem?
                Join the official Discord server and report it directly to help improve the beta platform.
              </p>
            </div>

            <div className="border border-zinc-800 bg-black/40 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-zinc-200 mb-3">
                Official Support Discord
              </h3>

              <a
                href="https://discord.gg/b3UN57qreV"
                onClick={() => window.open("https://discord.gg/b3UN57qreV", "_blank")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-all duration-200 hover:scale-[1.02]"
              >
                <span className="text-zinc-100 font-semibold">
                  Join Official Discord
                </span>
              </a>
            </div>

            <div className="text-sm text-zinc-600">
              Beta testers and speedrunners are encouraged to submit feedback and help improve moderation, rankings, and verification systems.
            </div>
          </div>
        </section>
      )}

      {/* SUBMIT */}
      {activeTab === "submit" && (
        <section className="max-w-2xl mx-auto px-6 py-10 space-y-4">
          <h2 className="text-2xl font-bold">Submit Run</h2>

          <input className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl" placeholder="Hunter Name" value={form.hunter} onChange={e => setForm({...form, hunter:e.target.value})} />

          <select className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl" value={form.weapon} onChange={e => setForm({...form, weapon:e.target.value})}>
            {weaponOptions.map(w => <option key={w}>{w}</option>)}
          </select>

          <select className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl" value={form.monster} onChange={e => setForm({...form, monster:e.target.value})}>
            {monsterOptions.map(m => <option key={m}>{m}</option>)}
          </select>

          <select className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl" value={form.system} onChange={e => setForm({...form, system:e.target.value})}>
            <option value="PC">PC</option>
            <option value="Xbox">Xbox</option>
            <option value="PS5">PS5</option>
          </select>

          <input className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl" placeholder="Time 00'00''00" value={form.time} onChange={e => setForm({...form, time:e.target.value})} />

          <input className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl" placeholder="YouTube Link" value={form.youtube} onChange={e => setForm({...form, youtube:e.target.value})} />

          <select className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl" value={form.level} onChange={e => setForm({...form, level:e.target.value})}>
            <option value="10★">10★</option>
            <option>10★</option>
            <option>9★</option>
            <option>8★</option>
            <option>7★</option>
            <option>6★</option>
          </select>
          
          <select className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl" value={form.ruleset} onChange={e => setForm({...form, ruleset:e.target.value})}>
            <option>TA Wiki</option>
            <option>Freestyle</option>
          </select>

          <button onClick={submitRun} className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-xl hover:bg-zinc-700">
            Submit Run
          </button>
        </section>
      )}

      <footer className="border-t border-zinc-800 py-10 px-6 text-center text-zinc-500 text-sm">
        Monster Hunter Wilds Speedrun Hub  
      </footer> 
    </div>
    </>
  );
}

