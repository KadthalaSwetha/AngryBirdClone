// Game variables
let birds = [],
  currentBird,
  slingBand,
  enemies = [],
  score = 0,
  scoreText,
  winText,
  timerText,
  retryButton,
  retryText,
  debugText
let launchPos = { x: 150, y: 450 }
let isLaunched = false
let birdCount = 5 // Ensure we have 5 birds
let birdsUsed = 0
let startTime, elapsedTime
let gameOver = false
let isPaused = false
let pigs = []
let launchedBirds = []
let pauseButton, resetButton
let slingshotCenter
let worldBounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 }
let pauseContainer, resetContainer // Store references to button containers
let birdObjects = [] // New array to store all bird objects
let birdTimers = [] // Store timers for birds

const Phaser = window.Phaser; // Declare Phaser variable

const config = {
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.RESIZE,
    parent: "game",
    width: "100%",
    height: "100%",
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  backgroundColor: "#87CEEB",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 300 },
      debug: false,
    },
  },
  scene: {
    preload,
    create,
    update,
  },
}

const game = new Phaser.Game(config)

function preload() {
  // Use direct URLs for images
  this.load.image("bg", "assets/background.png")
  this.load.image("bird", "assets/custom-bird.png")
  this.load.image("pig", "assets/custom-pig.png")
  this.load.image("block", "https://labs.phaser.io/assets/sprites/block.png")
  this.load.image("slingshot", "assets/slingshot.png")
}

function create() {
  // Reset all game variables
  this.pigsToRemove = []
  this.birdsToRemove = [] // New array to track birds to remove
  score = 0
  birds = []
  birdObjects = [] // Reset bird objects array
  birdTimers = [] // Reset bird timers array
  enemies = []
  birdCount = 5 // Ensure we have 5 birds
  birdsUsed = 0
  gameOver = false
  isLaunched = false
  isPaused = false
  pigs = []
  launchedBirds = []
  startTime = this.time.now
  
  const width = this.scale.width
  const height = this.scale.height
  
  // Set world bounds with responsive dimensions
  worldBounds = {
    minX: 0,
    minY: 0,
    maxX: width * 2,
    maxY: height,
  }

  // Set physics world bounds
  this.physics.world.setBounds(worldBounds.minX, worldBounds.minY, worldBounds.maxX, worldBounds.maxY)

  // Static positions for slingshot
  launchPos = { x: width * 0.15, y: height * 0.7 }

  // Add background
  this.add
    .image(width / 2, height / 2, "bg")
    .setDisplaySize(width, height)
    .setDepth(-1)

  // Add slingshot with responsive size
  const slingshot = this.add.image(launchPos.x, launchPos.y, "slingshot")
  slingshot.setDisplaySize(width * 0.15, height * 0.3).setDepth(1)

  const slingshotWidth = slingshot.displayWidth
  const slingshotHeight = slingshot.displayHeight

  // Static offsets for slingshot arms
  const leftArmXOffset = 0.19
  const leftArmYOffset = -0.35
  const rightArmXOffset = -0.03
  const rightArmYOffset = -0.33

  const slingshotLeftArm = {
    x: launchPos.x + slingshotWidth * leftArmXOffset,
    y: launchPos.y + slingshotHeight * leftArmYOffset,
  }
  const slingshotRightArm = {
    x: launchPos.x + slingshotWidth * rightArmXOffset,
    y: launchPos.y + slingshotHeight * rightArmYOffset,
  }

  // Calculate the center point between the two arms of the slingshot
  slingshotCenter = {
    x: (slingshotLeftArm.x + slingshotRightArm.x) / 2,
    y: (slingshotLeftArm.y + slingshotRightArm.y) / 2 - 10, // Slightly above the midpoint
  }

  slingBand = this.add.graphics()
  slingBand.setDepth(2)

  // Set camera bounds to match world bounds
  this.cameras.main.setBounds(worldBounds.minX, worldBounds.minY, worldBounds.maxX, worldBounds.maxY)
  
  // Center the camera at the start
  this.cameras.main.centerOn(width / 2, height / 2)

  // Responsive block size
  const blockSize = width * 0.06

  // Add debug text
  debugText = this.add.text(width * 0.02, height * 0.06, "Debug: Ready", {
    fontSize: `${width * 0.018}px`,
    fill: "#000",
  })
  debugText.setScrollFactor(0) // Keep debug text fixed on screen

  // Add bird count text
  const birdCountText = this.add.text(width * 0.02, height * 0.1, `Birds: ${birdCount}`, {
    fontSize: `${width * 0.018}px`,
    fill: "#000",
  })
  birdCountText.setScrollFactor(0)

  // Helper function to check if a position is valid
  function isValidPosition(x, y) {
    return (
      typeof x === "number" &&
      !isNaN(x) &&
      typeof y === "number" &&
      !isNaN(y) &&
      x >= worldBounds.minX &&
      x <= worldBounds.maxX &&
      y >= worldBounds.minY &&
      y <= worldBounds.maxY
    )
  }

  // Helper function to keep a position within bounds
  function keepInBounds(x, y) {
    return {
      x: Math.max(worldBounds.minX + 10, Math.min(x, worldBounds.maxX - 10)),
      y: Math.max(worldBounds.minY + 10, Math.min(y, worldBounds.maxY - 10)),
    }
  }

  // Create birds group
  this.birdGroup = this.physics.add.group({
    immovable: true, // Make birds static initially
    allowGravity: false // Disable gravity initially
  })

  // Create birds - exactly 5 birds with responsive size
  birds = []; // Clear the birds array to ensure we start fresh
  birdObjects = []; // Clear the bird objects array
  
  for (let i = 0; i < birdCount; i++) {
    // Create bird at the slingshot center
    const bird = this.physics.add.sprite(slingshotCenter.x, slingshotCenter.y, "bird")
    bird.setCollideWorldBounds(false) // Allow birds to go out of bounds
    bird.setBounce(0.2)
    bird.setInteractive()
    bird.visible = false // All birds are initially invisible
    bird.setDisplaySize(blockSize * 0.8, blockSize * 0.8)
    bird.setDepth(5)
    bird.index = i // Add index to track bird order

    // Make bird static initially
    bird.body.enable = false
    bird.body.immovable = true
    bird.body.allowGravity = false

    this.birdGroup.add(bird)
    birdObjects.push(bird) // Store all bird objects
  }
  
  // Store a copy of all birds for loading
  birds = [...birdObjects];

  // Create enemies group - static until hit
  this.enemyGroup = this.physics.add.group({
    immovable: true, // Make enemies static initially
    allowGravity: false // Disable gravity initially
  })
  
  // Create pig group - static until hit
  this.pigGroup = this.physics.add.group({
    immovable: true, // Make pigs static initially
    allowGravity: false // Disable gravity initially
  })

  // Define collision handlers BEFORE setting up collisions
  this.handleBirdEnemyCollision = (bird, enemy) => {
    // Make the enemy dynamic when hit
    enemy.body.immovable = false
    enemy.body.allowGravity = true
  }

  // Fixed collision handler to only remove pigs when hit by birds
  this.handleBirdPigCollision = (bird, pig) => {
    if (!pig.hit) {
      pig.setTint(0xff0000)
      pig.hit = true
      this.pigsToRemove.push(pig)
      score += 100
      scoreText.setText(`Score: ${score}`)
      
      // Make the pig dynamic when hit
      pig.body.immovable = false
      pig.body.allowGravity = true
    }
  }

  // Set up collisions
  this.physics.add.collider(this.birdGroup, this.enemyGroup, this.handleBirdEnemyCollision, null, this)
  this.physics.add.collider(this.birdGroup, this.pigGroup, this.handleBirdPigCollision, null, this)
  this.physics.add.collider(this.enemyGroup, this.pigGroup)
  this.physics.add.collider(this.enemyGroup, this.enemyGroup)

  // Responsive positions for enemies
  const startX = width * 0.65
  const startY = height * 0.7
  const spacing = width * 0.06
  const pigSize = blockSize * 0.8

  // Function to add enemies
  function addEnemy(x, y, type) {
    const obj = this.physics.add.sprite(x, y, type)
    obj.setDisplaySize(type === "pig" ? pigSize : blockSize, type === "pig" ? pigSize : blockSize)

    // Make static initially
    obj.body.enable = true
    obj.body.immovable = true
    obj.body.allowGravity = false

    if (type === "pig") {
      obj.name = "pig"
      this.pigGroup.add(obj)
      pigs.push(obj)
    } else {
      this.enemyGroup.add(obj)
    }

    enemies.push(obj)
  }

  // Add enemies with responsive positions
  for (let i = 0; i < 3; i++) {
    addEnemy.call(this, startX + i * spacing, startY, "block")
    if (i === 0) addEnemy.call(this, startX + i * spacing, startY - spacing, "pig")
    else addEnemy.call(this, startX + i * spacing, startY - spacing, "block")
    if (i < 2) addEnemy.call(this, startX + i * spacing, startY - spacing * 2, "pig")
    else addEnemy.call(this, startX + i * spacing, startY - spacing * 2, "block")
    if (i === 2) addEnemy.call(this, startX + i * spacing, startY - spacing * 3, "pig")
  }

  // UI elements with responsive positions
  scoreText = this.add.text(width * 0.02, height * 0.02, "Score: 0", {
    fontSize: `${width * 0.024}px`,
    fill: "#000",
  })
  scoreText.setScrollFactor(0) // Keep score text fixed on screen

  winText = this.add
    .text(width / 2, height / 2, "", {
      fontSize: `${width * 0.036}px`,
      fill: "#28a745",
      fontStyle: "bold",
    })
    .setOrigin(0.5)
    .setDepth(10)
    .setVisible(false)
    .setScrollFactor(0) // Keep win text fixed on screen

  timerText = this.add
    .text(width * 0.5, height * 0.02, "Time: 0s", {
      fontSize: `${width * 0.024}px`,
      fill: "#000",
    })
    .setOrigin(0.5, 0)
    .setScrollFactor(0) // Keep timer text fixed on screen

  // Create buttons with responsive sizes
  const buttonWidth = width * 0.1
  const buttonHeight = height * 0.05
  const buttonY = height * 0.02
  const buttonSpacing = width * 0.01
  const buttonX = width * 0.78

  // Create a container for the pause button
  pauseContainer = this.add.rectangle(buttonX, buttonY, buttonWidth, buttonHeight, 0xffea99)
  pauseContainer.setOrigin(0, 0)
  pauseContainer.setInteractive()
  pauseContainer.setScrollFactor(0) // Keep button fixed on screen
  pauseContainer.setDepth(100) // Ensure it's above everything

  // Add text to the pause button
  pauseButton = this.add
    .text(buttonX + buttonWidth / 2, buttonY + buttonHeight / 2, "Pause", {
      fontSize: `${width * 0.02}px`,
      fill: "#000",
    })
    .setOrigin(0.5, 0.5)
    .setScrollFactor(0) // Keep button text fixed on screen
    .setDepth(101) // Ensure it's above the container

  // Create a container for the reset button
  resetContainer = this.add.rectangle(
    buttonX + buttonWidth + buttonSpacing,
    buttonY,
    buttonWidth,
    buttonHeight,
    0x274ab3,
  )
  resetContainer.setOrigin(0, 0)
  resetContainer.setInteractive()
  resetContainer.setScrollFactor(0) // Keep button fixed on screen
  resetContainer.setDepth(100) // Ensure it's above everything

  // Add text to the reset button
  resetButton = this.add
    .text(buttonX + buttonWidth + buttonSpacing + buttonWidth / 2, buttonY + buttonHeight / 2, "Reset", {
      fontSize: `${width * 0.02}px`,
      fill: "#fff",
    })
    .setOrigin(0.5, 0.5)
    .setScrollFactor(0) // Keep button text fixed on screen
    .setDepth(101) // Ensure it's above the container

  // Create retry button (initially hidden)
  retryButton = this.add.rectangle(width / 2, height / 2 + 100, buttonWidth * 1.5, buttonHeight, 0x274ab3)
  retryButton.setOrigin(0.5, 0.5)
  retryButton.setInteractive()
  retryButton.setVisible(false)
  retryButton.setScrollFactor(0) // Keep button fixed on screen

  retryText = this.add
    .text(width / 2, height / 2 + 100, "Retry", {
      fontSize: `${width * 0.024}px`,
      fill: "#fff",
    })
    .setOrigin(0.5, 0.5)
    .setDepth(10)
    .setVisible(false)
    .setScrollFactor(0) // Keep button text fixed on screen

  // Define loadNextBird function and attach it to the scene
  this.loadNextBird = function () {
    debugText.setText("Debug: Loading next bird")

    if (birds.length === 0) {
      debugText.setText("Debug: No more birds")
      // Check if game should end
      this.endGame()
      return
    }

    currentBird = birds.shift()
    currentBird.visible = true

    // Position the bird at the center of the slingshot
    currentBird.setPosition(slingshotCenter.x, slingshotCenter.y)
    
    // Keep bird static until launched
    currentBird.body.enable = true
    currentBird.body.immovable = true
    currentBird.body.allowGravity = false
    currentBird.body.velocity.set(0, 0)

    isLaunched = false
    this.input.setDraggable(currentBird)

    // Update bird count text
    birdCountText.setText(`Birds: ${birds.length + 1}`); // +1 for current bird

    debugText.setText(`Debug: Bird loaded at ${slingshotCenter.x.toFixed(0)},${slingshotCenter.y.toFixed(0)}`)
  }

  // Define endGame function and attach it to the scene
  this.endGame = function () {
    if (gameOver) return // Prevent multiple calls

    gameOver = true
    debugText.setText(`Debug: Game over`)

    // Create semi-transparent overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
    overlay.setDepth(9)
    overlay.setScrollFactor(0) // Keep overlay fixed on screen

    if (pigs.length === 0) {
      // Win condition
      winText.setText(`Congratulations, You Win!\nScore: ${score}\nTime: ${elapsedTime}s`)
      winText.setFill("#28a745") // Green color
    } else {
      // Lose condition
      winText.setText(`You Failed!\nScore: ${score}`)
      winText.setFill("#dc3545") // Red color
    }

    winText.setVisible(true)
    retryButton.setVisible(true)
    retryText.setVisible(true)
  }

  // Define checkBirdStatus function and attach it to the scene
  this.checkBirdStatus = function () {
    if (!currentBird || !currentBird.body || gameOver) {
      debugText.setText(`Debug: Invalid bird in checkBirdStatus`)
      return
    }

    // Check for NaN position
    if (!isValidPosition(currentBird.x, currentBird.y)) {
      debugText.setText(`Debug: Bird has invalid position, resetting`)

      // Check if all birds have been used
      if (birdsUsed >= birdCount) {
        this.endGame()
      } else if (birds.length > 0) {
        // Add a delay before loading the next bird
        this.time.delayedCall(
          1000,
          () => {
            this.loadNextBird()
          },
          [],
          this,
        )
      } else {
        this.endGame()
      }
      return
    }

    // Check if bird is moving
    const velocity = currentBird.body.velocity
    const isMoving = Math.abs(velocity.x) > 10 || Math.abs(velocity.y) > 10

    if (!isMoving) {
      debugText.setText(`Debug: Bird stopped moving at ${currentBird.x.toFixed(0)},${currentBird.y.toFixed(0)}`)

      // Check if all birds have been used
      if (birdsUsed >= birdCount) {
        this.endGame()
      } else if (birds.length > 0) {
        // Add a delay before loading the next bird
        this.time.delayedCall(
          1000,
          () => {
            this.loadNextBird()
          },
          [],
          this,
        )
      } else {
        this.endGame()
      }
    } else {
      debugText.setText(
        `Debug: Bird still moving at ${currentBird.x.toFixed(0)},${currentBird.y.toFixed(0)}, v=${velocity.x.toFixed(2)},${velocity.y.toFixed(2)}`,
      )
      this.time.delayedCall(1000, () => this.checkBirdStatus(), [], this)
    }
  }

  // FIXED: Pause functionality to ensure buttons remain clickable
  this.togglePause = function () {
    isPaused = !isPaused
    debugText.setText(`Debug: Game ${isPaused ? "paused" : "resumed"}`)

    if (isPaused) {
      pauseButton.setText("Resume")
      
      // Store velocities and pause physics for game objects
      this.birdGroup.getChildren().forEach(bird => {
        if (bird.body && bird.body.enable) {
          bird.oldVelocityX = bird.body.velocity.x;
          bird.oldVelocityY = bird.body.velocity.y;
          bird.body.velocity.x = 0;
          bird.body.velocity.y = 0;
        }
      });
      
      this.enemyGroup.getChildren().forEach(enemy => {
        if (enemy.body && enemy.body.enable) {
          enemy.oldVelocityX = enemy.body.velocity.x;
          enemy.oldVelocityY = enemy.body.velocity.y;
          enemy.body.velocity.x = 0;
          enemy.body.velocity.y = 0;
        }
      });
      
      this.pigGroup.getChildren().forEach(pig => {
        if (pig.body && pig.body.enable) {
          pig.oldVelocityX = pig.body.velocity.x;
          pig.oldVelocityY = pig.body.velocity.y;
          pig.body.velocity.x = 0;
          pig.body.velocity.y = 0;
        }
      });
      
      // Pause physics but keep scene active for UI
      this.physics.pause();
      
      // Pause all bird timers
      birdTimers.forEach(timer => {
        if (timer) {
          timer.paused = true;
        }
      });
    } else {
      pauseButton.setText("Pause")
      
      // Restore velocities and resume physics
      this.birdGroup.getChildren().forEach(bird => {
        if (bird.body && bird.body.enable && bird.oldVelocityX !== undefined) {
          bird.body.velocity.x = bird.oldVelocityX;
          bird.body.velocity.y = bird.oldVelocityY;
        }
      });
      
      this.enemyGroup.getChildren().forEach(enemy => {
        if (enemy.body && enemy.body.enable && enemy.oldVelocityX !== undefined) {
          enemy.body.velocity.x = enemy.oldVelocityX;
          enemy.body.velocity.y = enemy.oldVelocityY;
        }
      });
      
      this.pigGroup.getChildren().forEach(pig => {
        if (pig.body && pig.body.enable && pig.oldVelocityX !== undefined) {
          pig.body.velocity.x = pig.oldVelocityX;
          pig.body.velocity.y = pig.oldVelocityY;
        }
      });
      
      // Resume physics
      this.physics.resume();
      
      // Resume all bird timers
      birdTimers.forEach(timer => {
        if (timer) {
          timer.paused = false;
        }
      });
    }
  }

  // Define resetGame function and attach it to the scene
  this.resetGame = function () {
    // Reset the timer
    startTime = this.time.now
    elapsedTime = 0
    timerText.setText("Time: 0s")

    // Reset the scene
    this.scene.restart()
  }

  // Add event listeners to the containers
  pauseContainer.on("pointerdown", () => {
    this.togglePause()
  })

  resetContainer.on("pointerdown", () => {
    this.resetGame()
  })

  retryButton.on("pointerdown", () => {
    this.resetGame()
  })

  // Add input event to handle pause with keyboard
  this.input.keyboard.on("keydown-P", () => {
    this.togglePause()
  })

  // Add input event to handle reset with keyboard
  this.input.keyboard.on("keydown-R", () => {
    this.resetGame()
  })

  // Load the first bird
  this.loadNextBird();
  debugText.setText(`Debug: First bird loaded, remaining birds: ${birds.length}`);

  // SIMPLIFIED DRAG HANDLING
  this.input.on("dragstart", (pointer, gameObject) => {
    if (gameOver || isLaunched || isPaused) return

    // Ensure bird is draggable but still static
    gameObject.body.enable = true
    gameObject.body.immovable = true
    gameObject.body.allowGravity = false
    
    debugText.setText(`Debug: Drag start at ${gameObject.x.toFixed(0)},${gameObject.y.toFixed(0)}`)
  })

  this.input.on("drag", (pointer, gameObject, dragX, dragY) => {
    if (isLaunched || gameObject !== currentBird || isPaused) return

    // Validate coordinates
    if (!isValidPosition(dragX, dragY)) {
      debugText.setText(`Debug: Invalid drag position: ${dragX},${dragY}`)
      return
    }

    const maxDistance = width * 0.25 // Responsive max distance
    const distance = Phaser.Math.Distance.Between(slingshotCenter.x, slingshotCenter.y, dragX, dragY)

    if (distance > maxDistance) {
      const angle = Phaser.Math.Angle.Between(slingshotCenter.x, slingshotCenter.y, dragX, dragY)
      dragX = slingshotCenter.x + Math.cos(angle) * maxDistance
      dragY = slingshotCenter.y + Math.sin(angle) * maxDistance
    }

    // Keep the bird within bounds
    const boundedPosition = keepInBounds(dragX, dragY)
    gameObject.setPosition(boundedPosition.x, boundedPosition.y)
    debugText.setText(`Debug: Dragging to ${boundedPosition.x.toFixed(0)},${boundedPosition.y.toFixed(0)}`)

    slingBand.clear()
    slingBand.lineStyle(4, 0x8b4513, 1.0)
    slingBand.beginPath()
    slingBand.moveTo(slingshotLeftArm.x, slingshotLeftArm.y)
    slingBand.lineTo(boundedPosition.x, boundedPosition.y)
    slingBand.lineTo(slingshotRightArm.x, slingshotRightArm.y)
    slingBand.strokePath()
  })

  // IMPROVED LAUNCH MECHANISM
  this.input.on("dragend", (pointer, bird) => {
    if (isLaunched || isPaused) return

    slingBand.clear()
    debugText.setText(`Debug: Drag end at ${bird.x.toFixed(0)},${bird.y.toFixed(0)}`)

    // Validate bird position
    if (!isValidPosition(bird.x, bird.y)) {
      debugText.setText(`Debug: Invalid bird position at dragend: ${bird.x},${bird.y}`)
      bird.setPosition(slingshotCenter.x, slingshotCenter.y)
      return
    }

    const distance = Phaser.Math.Distance.Between(bird.x, bird.y, slingshotCenter.x, slingshotCenter.y)
    if (distance > 5) {
      try {
        // Calculate the launch velocity based on the distance and direction
        const forceMultiplier = 12 // Increased for better launch power

        // Calculate the direction from bird to slingshot (for the slingshot effect)
        const dirX = slingshotCenter.x - bird.x
        const dirY = slingshotCenter.y - bird.y

        // Make bird dynamic for physics
        bird.body.immovable = false
        bird.body.allowGravity = true

        // Set the initial velocity
        bird.body.velocity.x = dirX * forceMultiplier
        bird.body.velocity.y = dirY * forceMultiplier

        debugText.setText(
          `Debug: Bird launched with velocity ${bird.body.velocity.x.toFixed(2)},${bird.body.velocity.y.toFixed(2)}`,
        )

        isLaunched = true
        bird.launched = true
        launchedBirds.push(bird)
        currentBird = bird
        birdsUsed++

        // NEW: Set a timer to make the bird disappear after 5 seconds
        const birdTimer = this.time.delayedCall(
          5000, // 5 seconds
          () => {
            if (bird && !bird.isDestroyed) {
              debugText.setText(`Debug: Bird disappeared after 5 seconds`);
              bird.isDestroyed = true;
              bird.visible = false;
              bird.body.enable = false;
              
              // Check if we need to load the next bird
              if (birds.length > 0) {
                this.time.delayedCall(
                  1000,
                  () => {
                    this.loadNextBird();
                  },
                  [],
                  this
                );
              } else if (birdsUsed >= birdCount) {
                this.endGame();
              }
            }
          },
          [],
          this
        );
        
        // Store the timer reference
        birdTimers.push(birdTimer);
      } catch (error) {
        debugText.setText(`Debug: Error during launch: ${error.message}`)
        bird.setPosition(slingshotCenter.x, slingshotCenter.y)
        bird.body.immovable = true
        bird.body.allowGravity = false
      }
    } else {
      bird.setPosition(slingshotCenter.x, slingshotCenter.y)
    }
  })
}

function update() {
  if (gameOver) return
  
  // Only update game logic if not paused
  if (!isPaused) {
    // Update timer
    elapsedTime = Math.floor((this.time.now - startTime) / 1000)
    timerText.setText(`Time: ${elapsedTime}s`)

    // Check for pigs to remove - only when hit by birds
    if (this.pigsToRemove && this.pigsToRemove.length) {
      this.pigsToRemove.forEach((pig) => {
        pig.destroy()
        pigs = pigs.filter((p) => p !== pig)
      })
      this.pigsToRemove = []

      // Check if all pigs are destroyed
      if (pigs.length === 0 && !gameOver) {
        this.endGame()
      }
    }

    // Update debug text with bird position if bird exists
    if (currentBird && currentBird.body && !currentBird.isDestroyed) {
      // Check for valid position
      if (
        typeof currentBird.x === "number" &&
        !isNaN(currentBird.x) &&
        typeof currentBird.y === "number" &&
        !isNaN(currentBird.y)
      ) {
        // Check if bird is out of LEFT or RIGHT bounds only - make it disappear
        if (
          currentBird.x < worldBounds.minX ||
          currentBird.x > worldBounds.maxX
        ) {
          debugText.setText(`Debug: Bird out of horizontal bounds at ${currentBird.x.toFixed(0)},${currentBird.y.toFixed(0)}`)

          // Make the bird disappear when it touches the left or right boundary
          if (isLaunched && !currentBird.isDestroyed) {
            currentBird.isDestroyed = true
            currentBird.visible = false // Make the bird invisible
            currentBird.body.enable = false // Disable physics
            
            // Check if all birds have been used
            if (birdsUsed >= birdCount) {
              this.endGame()
            } else if (birds.length > 0) {
              // Add a delay before loading the next bird
              this.time.delayedCall(
                1000,
                () => {
                  this.loadNextBird()
                },
                [],
                this
              )
            } else {
              this.endGame()
            }
          }
        } else {
          debugText.setText(
            `Debug: Bird at ${currentBird.x.toFixed(0)},${currentBird.y.toFixed(0)}, v=${currentBird.body.velocity.x.toFixed(2)},${currentBird.body.velocity.y.toFixed(2)}`,
          )
        }
      } else {
        debugText.setText(`Debug: Bird has NaN position`)

        // Reset bird position if it has NaN coordinates
        if (!isLaunched) {
          currentBird.setPosition(slingshotCenter.x, slingshotCenter.y)
          currentBird.body.immovable = true
          currentBird.body.allowGravity = false
          currentBird.body.velocity.set(0, 0)
          debugText.setText(`Debug: Reset bird position due to NaN`)
        } else {
          // If it's a launched bird with NaN, consider it out of bounds
          currentBird.isDestroyed = true
          currentBird.visible = false // Make the bird invisible
          currentBird.body.enable = false // Disable physics
          
          if (birds.length > 0) {
            this.time.delayedCall(
              1000,
              () => {
                this.loadNextBird()
              },
              [],
              this
            )
          } else {
            this.endGame()
          }
        }
      }
    }
  }
}