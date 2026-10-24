const gamification = {
    points: 0,
    badges: [],
    actions: {
      uploadBook: { points: 50, badge: "Creator" },
      tradeBook: { points: 20, badge: "Trader" },
      readBook: { points: 10, badge: "Reader" }
    }
  };
  
  function awardPoints(action) {
    const reward = gamification.actions[action];
    gamification.points += reward.points;
    if (!gamification.badges.includes(reward.badge)) {
      gamification.badges.push(reward.badge);
      alert(`Earned badge: ${reward.badge}!`);
    }
    updateLeaderboard();
  }
  
  function updateLeaderboard() {
    // API call to update global leaderboard
    console.log(`User points: ${gamification.points}, Badges: ${gamification.badges}`);
  }
  