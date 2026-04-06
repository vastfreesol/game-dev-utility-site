const blueprintSanityData = {
  types: [
    {
      id: "actor",
      label: "Actor",
      summary: "A general gameplay object that can be placed or spawned in a level. Good home for level-present behavior, traces, timers, and references to components.",
      bestFor: "World-space gameplay logic, collision-driven events, spawning, traces, and owning components.",
      avoid: "Purely reusable utility helpers or UI-only behavior that does not belong to an in-world object.",
      notes: [
        "Actor Blueprints are usually the default home when the logic belongs to one placed or spawned thing in the level.",
        "Many static-library nodes still make sense here because Actors naturally provide world context."
      ],
      docLinks: [
        {
          label: "Actors Reference",
          url: "https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-actors-reference?application_version=5.6"
        },
        {
          label: "Types of Blueprints",
          url: "https://dev.epicgames.com/documentation/en-us/unreal-engine/types-of-blueprints-in-unreal-engine?application_version=5.6"
        }
      ]
    },
    {
      id: "pawn",
      label: "Pawn",
      summary: "An Actor meant to be possessed or driven. Best for gameplay logic tied to control, possession, and movement input.",
      bestFor: "Input-driven movement, possession flow, controller interactions, and pawn-specific movement helpers.",
      avoid: "Generic stateless helpers that should live in a utility library or behavior that only belongs to a nested component.",
      notes: [
        "Pawn-specific nodes often become available directly on self because the Blueprint inherits from APawn.",
        "Character extends Pawn, so many Pawn-target nodes also make sense in Character Blueprints."
      ],
      docLinks: [
        {
          label: "Types of Blueprints",
          url: "https://dev.epicgames.com/documentation/en-us/unreal-engine/types-of-blueprints-in-unreal-engine?application_version=5.6"
        },
        {
          label: "APawn::AddMovementInput",
          url: "https://dev.epicgames.com/documentation/es-mx/unreal-engine/API/Runtime/Engine/GameFramework/APawn/AddMovementInput"
        }
      ]
    },
    {
      id: "character",
      label: "Character",
      summary: "A Pawn with built-in movement and character-focused gameplay assumptions. Strong home for player and enemy locomotion logic.",
      bestFor: "Locomotion, controller-facing gameplay logic, ability hooks, traces from the avatar, and UI creation initiated by the character.",
      avoid: "Reusable helpers that should be shared across many classes or graph logic that belongs to the animation layer rather than gameplay.",
      notes: [
        "Character inherits from Pawn, so Pawn-target nodes are usually direct fits here.",
        "If the logic really belongs to one reusable subsystem, a Component may still be cleaner than packing it into the Character graph."
      ],
      docLinks: [
        {
          label: "GameFramework Overview",
          url: "https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/GameFramework"
        },
        {
          label: "APawn::AddMovementInput",
          url: "https://dev.epicgames.com/documentation/es-mx/unreal-engine/API/Runtime/Engine/GameFramework/APawn/AddMovementInput"
        }
      ]
    },
    {
      id: "actor-component",
      label: "Actor Component",
      summary: "Reusable behavior attached to an Actor. Good for logic that should travel with many different owning Actors.",
      bestFor: "Reusable gameplay features like health, inventory, cooldowns, buffs, and AI helper logic.",
      avoid: "Transform-heavy behavior that needs its own scene hierarchy, or helpers that should be pure static utilities.",
      notes: [
        "Actor Components do not have their own transform, so world-space work often routes through the owner.",
        "Component graphs often rely on Get Owner and owner-derived references."
      ],
      docLinks: [
        {
          label: "Adding Components to an Actor",
          url: "https://dev.epicgames.com/documentation/ru-ru/unreal-engine/adding-components-to-an-actor-in-unreal-engine"
        },
        {
          label: "UActorComponent::GetOwner",
          url: "https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/Components/UActorComponent/GetOwner"
        }
      ]
    },
    {
      id: "scene-component",
      label: "Scene Component",
      summary: "A transform-aware component. Best when the reusable behavior also needs location, rotation, or attachment hierarchy.",
      bestFor: "Cameras, spring arms, sockets, local-space offsets, and transform-aware helper logic.",
      avoid: "Plain reusable systems that do not need their own transform or attachment chain.",
      notes: [
        "Scene Component is still a component, so owner access patterns stay relevant.",
        "If your node target is Pawn or Actor, you often call through owner or another reference instead of directly on self."
      ],
      docLinks: [
        {
          label: "Adding Components to an Actor",
          url: "https://dev.epicgames.com/documentation/ru-ru/unreal-engine/adding-components-to-an-actor-in-unreal-engine"
        },
        {
          label: "UActorComponent::SetAutoActivate",
          url: "https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/Components/UActorComponent/SetAutoActivate"
        }
      ]
    },
    {
      id: "level-blueprint",
      label: "Level Blueprint",
      summary: "A level-wide global event graph. Good for one-off level orchestration, sequenced events, and level-streaming style glue.",
      bestFor: "Level-specific scripting, startup orchestration, scripted sequences, and binding placed actors together.",
      avoid: "Reusable gameplay systems that should move with actors or components across levels.",
      notes: [
        "Level Blueprints are practical for glue code, but they become hard to reuse if they absorb too much system behavior.",
        "Static-library nodes often feel natural here because the graph already acts as a project-level coordinator."
      ],
      docLinks: [
        {
          label: "Types of Blueprints",
          url: "https://dev.epicgames.com/documentation/en-us/unreal-engine/types-of-blueprints-in-unreal-engine?application_version=5.6"
        }
      ]
    },
    {
      id: "widget-blueprint",
      label: "Widget Blueprint",
      summary: "A UI graph for UMG. Best for presentation, UI events, and player-facing interface logic.",
      bestFor: "Menus, HUD interactions, displaying player data, and UI event handling.",
      avoid: "Heavy world gameplay ownership, actor-specific movement logic, and systems that should survive independently of the UI.",
      notes: [
        "Widgets often consume global utility nodes, but many gameplay nodes only make sense after you grab the right player, pawn, or subsystem reference.",
        "Create Widget commonly lives outside the widget itself, in a Character, Controller, or Level Blueprint."
      ],
      docLinks: [
        {
          label: "Creating Widgets",
          url: "https://dev.epicgames.com/documentation/en-us/unreal-engine/creating-widgets-in-unreal-engine?application_version=5.6"
        },
        {
          label: "Widget Blueprints",
          url: "https://dev.epicgames.com/documentation/es-es/unreal-engine/widget-blueprints-in-umg-for-unreal-engine"
        }
      ]
    },
    {
      id: "animation-blueprint",
      label: "Animation Blueprint",
      summary: "A specialized Blueprint that drives animation graphs and pose logic. Great for animation state, bad as a dumping ground for general gameplay.",
      bestFor: "Animation variables, state machines, pose blending, and animation-specific event-graph work.",
      avoid: "General-purpose gameplay orchestration, UI bootstrapping, and broad latent gameplay flow.",
      notes: [
        "Animation Blueprints are specialized and performance-sensitive, so many global gameplay nodes are technically reachable but not the cleanest home.",
        "If the graph needs controller or world gameplay context, push the data in from gameplay code instead of growing the Anim Blueprint into a god object."
      ],
      docLinks: [
        {
          label: "Animation Blueprints",
          url: "https://dev.epicgames.com/documentation/ru-ru/unreal-engine/animation-blueprints-in-unreal-engine?application_version=5.6"
        },
        {
          label: "Graphing in Animation Blueprints",
          url: "https://dev.epicgames.com/documentation/en-us/unreal-engine/graphing-in-animation-blueprints-in-unreal-engine?application_version=5.6"
        }
      ]
    },
    {
      id: "blueprint-function-library",
      label: "Blueprint Function Library",
      summary: "A home for shared stateless helpers. Think utility functions, not object-specific state or latent event flow.",
      bestFor: "Shared stateless helpers, conversions, formatting, and utility functions that should be callable across the project.",
      avoid: "Stateful logic, owner-dependent behavior, and latent event-graph style flow like Delay-heavy orchestration.",
      notes: [
        "Epic describes Blueprint Function Libraries as collections of static utility functions not tied to a particular gameplay object.",
        "If a node concept depends heavily on self, owner, or per-instance latent flow, a Function Library is usually the wrong home."
      ],
      docLinks: [
        {
          label: "Blueprint Function Libraries",
          url: "https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprint-function-libraries-in-unreal-engine?application_version=5.6"
        }
      ]
    },
    {
      id: "blueprint-interface",
      label: "Blueprint Interface",
      summary: "A contract that defines function names without implementation. Great for communication boundaries, not for owning behavior.",
      bestFor: "Declaring shared callable messages across many unrelated Blueprint classes.",
      avoid: "State, components, latent flow, reusable macros, or implementation-heavy utility logic.",
      notes: [
        "Epic's Blueprint Interface docs explicitly call out that interfaces cannot add variables, edit graphs, or add components.",
        "Use interfaces to describe messages, then implement the actual behavior somewhere else."
      ],
      docLinks: [
        {
          label: "Types of Blueprints",
          url: "https://dev.epicgames.com/documentation/en-us/unreal-engine/types-of-blueprints-in-unreal-engine?application_version=5.6"
        }
      ]
    },
    {
      id: "blueprint-macro-library",
      label: "Blueprint Macro Library",
      summary: "A reusable graph-snippet container. Useful for shared graph structure, but not a substitute for object ownership or stateless helper APIs.",
      bestFor: "Reused node sequences, graph ergonomics, and shared execution snippets.",
      avoid: "Owning gameplay state, component access patterns that depend on a stable self, or pretending the macro itself is the gameplay system.",
      notes: [
        "Macro Libraries are auto-expanded into referencing graphs at compile time.",
        "They are best treated as graph reuse helpers, not as the authoritative home of a system."
      ],
      docLinks: [
        {
          label: "Types of Blueprints",
          url: "https://dev.epicgames.com/documentation/en-us/unreal-engine/types-of-blueprints-in-unreal-engine?application_version=5.6"
        }
      ]
    }
  ],
  functions: [
    {
      id: "delay",
      label: "Delay",
      target: "Kismet System Library",
      kind: "Latent global utility",
      summary: "A latent flow-control node for waiting a number of seconds before continuing execution.",
      officialFact: "Epic's Blueprint API lists Delay under Utilities > Flow Control and says the target is Kismet System Library.",
      inference: "Treat Delay as a world-context event-graph node. It is not owned by Actor specifically, but it most naturally lives in graphs that already own real gameplay flow.",
      defaultTypes: ["actor", "character", "pawn", "actor-component", "level-blueprint", "widget-blueprint"],
      parameters: [
        {
          name: "Duration",
          tone: "warm",
          requirement: "Required input",
          details: "How many seconds to wait before the execution flow continues."
        },
        {
          name: "Completed",
          tone: "cool",
          requirement: "Execution output",
          details: "The exec pin that fires after the delay finishes."
        }
      ],
      overrideNotes: [
        "In components, this is usually fine when the component owns the timing behavior itself.",
        "In widgets, it works best for small UI pacing tasks rather than broad gameplay state management.",
        "If you are tempted to hide Delay inside a Function Library or Interface, that is usually a sign the logic belongs in an event graph instead."
      ],
      utilityTypes: ["actor", "pawn", "character", "actor-component", "scene-component", "level-blueprint", "widget-blueprint"],
      directTypes: [],
      referenceTypes: [],
      cautionTypes: ["animation-blueprint", "blueprint-macro-library"],
      blockedTypes: ["blueprint-function-library", "blueprint-interface"],
      notes: [
        "Good fit for event-graph orchestration and short gameplay flow pauses.",
        "Poor fit for Blueprint Interfaces because interfaces define signatures only, not graph execution.",
        "Usually a bad smell inside Function Libraries because the concept is static utility, not latent stateful flow."
      ],
      docLinks: [
        {
          label: "Delay",
          url: "https://dev.epicgames.com/documentation/en-us/unreal-engine/BlueprintAPI/Utilities/FlowControl/Delay?application_version=5.6"
        },
        {
          label: "Blueprint Function Libraries",
          url: "https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprint-function-libraries-in-unreal-engine?application_version=5.6"
        }
      ]
    },
    {
      id: "retriggerable-delay",
      label: "Retriggerable Delay",
      target: "Kismet System Library",
      kind: "Latent global utility",
      summary: "A delay node that resets its countdown if triggered again before completion.",
      officialFact: "Epic's docs list Retriggerable Delay in BlueprintAPI > Utilities > Flow Control with target Kismet System Library.",
      inference: "Use the same placement instincts as Delay, but reserve it for event-driven countdowns that can restart.",
      defaultTypes: ["actor", "character", "pawn", "actor-component", "level-blueprint", "widget-blueprint"],
      parameters: [
        {
          name: "Duration",
          tone: "warm",
          requirement: "Required input",
          details: "The resettable wait time in seconds."
        },
        {
          name: "Completed",
          tone: "cool",
          requirement: "Execution output",
          details: "Fires only when the most recent countdown actually reaches the end."
        }
      ],
      overrideNotes: [
        "Best when repeated triggers are expected, such as cooldown refreshes, hover timers, or debounce-style gameplay events.",
        "If a different Blueprint keeps retriggering it through references, that often means the countdown should move closer to the system that owns the event."
      ],
      utilityTypes: ["actor", "pawn", "character", "actor-component", "scene-component", "level-blueprint", "widget-blueprint"],
      directTypes: [],
      referenceTypes: [],
      cautionTypes: ["animation-blueprint", "blueprint-macro-library"],
      blockedTypes: ["blueprint-function-library", "blueprint-interface"],
      notes: [
        "Strong fit for cooldown-style event flow and resettable timing logic.",
        "The fact that it is a Kismet System Library node means the owning Blueprint type is less important than the graph context."
      ],
      docLinks: [
        {
          label: "Retriggerable Delay",
          url: "https://dev.epicgames.com/documentation/en-us/unreal-engine/BlueprintAPI/Utilities/FlowControl/RetriggerableDelay?application_version=5.6"
        },
        {
          label: "Delay",
          url: "https://dev.epicgames.com/documentation/en-us/unreal-engine/BlueprintAPI/Utilities/FlowControl/Delay?application_version=5.6"
        }
      ]
    },
    {
      id: "line-trace-by-channel",
      label: "Line Trace By Channel",
      target: "Kismet System Library",
      kind: "Global utility with world context",
      summary: "A utility trace node that performs a collision trace along a line and returns the first blocking hit.",
      officialFact: "Epic documents Line Trace By Channel as UKismetSystemLibrary::LineTraceSingle with WorldContextObject and the DisplayName 'Line Trace By Channel'.",
      inference: "Because it is a Kismet System Library function with world context, it belongs anywhere that sensibly owns a trace, not to one single Blueprint family.",
      defaultTypes: ["character", "actor", "pawn", "actor-component", "scene-component", "level-blueprint"],
      parameters: [
        {
          name: "Start",
          tone: "warm",
          requirement: "Required input",
          details: "World-space start location for the trace."
        },
        {
          name: "End",
          tone: "warm",
          requirement: "Required input",
          details: "World-space end location for the trace."
        },
        {
          name: "Trace Channel",
          tone: "warm",
          requirement: "Required input",
          details: "The collision channel the trace should test against."
        },
        {
          name: "Actors To Ignore",
          tone: "accent",
          requirement: "Common override",
          details: "Optional ignore list used to skip self, the instigator, or other known actors."
        },
        {
          name: "Draw Debug Type",
          tone: "accent",
          requirement: "Common override",
          details: "Helpful during debugging to visualize the trace in the world."
        },
        {
          name: "Out Hit",
          tone: "cool",
          requirement: "Primary output",
          details: "Hit result data returned when the trace finds something."
        },
        {
          name: "Return Value",
          tone: "cool",
          requirement: "Primary output",
          details: "Boolean result indicating whether the trace hit a blocking object."
        }
      ],
      overrideNotes: [
        "For UI-triggered traces, the widget should usually ask a gameplay owner to perform the trace rather than originating it itself.",
        "If you always ignore the same owner or attached actors, wrap that setup close to the weapon, sensor, or interaction component that owns the trace."
      ],
      utilityTypes: ["actor", "pawn", "character", "actor-component", "scene-component", "level-blueprint"],
      directTypes: [],
      referenceTypes: ["widget-blueprint"],
      cautionTypes: ["animation-blueprint", "blueprint-function-library", "blueprint-macro-library"],
      blockedTypes: ["blueprint-interface"],
      notes: [
        "Great fit in Actors, Characters, and Components that own sensing, interaction, or weapon logic.",
        "Widgets can use trace-driven results indirectly, but tracing itself usually belongs in gameplay code rather than UI.",
        "Function Libraries can wrap tracing in C++, but as a Blueprint-home recommendation they are usually not where the gameplay trace should originate."
      ],
      docLinks: [
        {
          label: "UKismetSystemLibrary::LineTraceSingle",
          url: "https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/Kismet/UKismetSystemLibrary/LineTraceSingle"
        },
        {
          label: "Single Line Trace How-To",
          url: "https://dev.epicgames.com/documentation/ru-ru/unreal-engine/using-a-single-line-trace-raycast-by-channel-in-unreal-engine?application_version=5.6"
        }
      ]
    },
    {
      id: "get-player-pawn",
      label: "Get Player Pawn",
      target: "Gameplay Statics",
      kind: "Global gameplay utility",
      summary: "Returns the Pawn for a player index. Useful when a graph needs to bridge from a global context into player-owned gameplay.",
      officialFact: "Epic's Blueprint API lists Get Player Pawn under BlueprintAPI > Game and says the target is Gameplay Statics.",
      inference: "This is a bridge node, not a sign that the current Blueprint should own player logic. Use it when a graph needs a player reference, then hand off to the correct owner.",
      defaultTypes: ["level-blueprint", "widget-blueprint", "actor", "character", "actor-component"],
      parameters: [
        {
          name: "Player Index",
          tone: "warm",
          requirement: "Required input",
          details: "Which local player to resolve. `0` is the default for most single-player setups."
        },
        {
          name: "Return Value",
          tone: "cool",
          requirement: "Primary output",
          details: "The Pawn found for that player index, if one exists."
        }
      ],
      overrideNotes: [
        "In multiplayer or split-screen work, you often need to override the default `0` player index.",
        "If a system keeps calling this over and over, it is often cleaner to store the Pawn reference once and pass it around."
      ],
      utilityTypes: ["actor", "pawn", "character", "actor-component", "scene-component", "level-blueprint", "widget-blueprint"],
      directTypes: [],
      referenceTypes: [],
      cautionTypes: ["animation-blueprint", "blueprint-function-library", "blueprint-macro-library"],
      blockedTypes: ["blueprint-interface"],
      notes: [
        "Very common in Level Blueprints and widgets because they often need to find the current player-facing object.",
        "If you keep calling this deep in many gameplay systems, it is often a sign to pass a stronger reference around instead."
      ],
      docLinks: [
        {
          label: "Get Player Pawn",
          url: "https://dev.epicgames.com/documentation/en-us/unreal-engine/BlueprintAPI/Game/GetPlayerPawn"
        }
      ]
    },
    {
      id: "get-owner",
      label: "Get Owner",
      target: "Actor Component",
      kind: "Instance function",
      summary: "Returns the Actor that owns a component. This is one of the most useful sanity-check nodes for component-authored behavior.",
      officialFact: "Epic documents UActorComponent::GetOwner as a BlueprintCallable component function that follows the outer chain to the owning Actor.",
      inference: "If you are reaching for Get Owner, the graph probably belongs in a component. Outside a component, you usually need a component reference first.",
      defaultTypes: ["actor-component", "scene-component"],
      parameters: [
        {
          name: "Target",
          tone: "warm",
          requirement: "Required input",
          details: "The component instance whose owning Actor you want. On component Blueprints this is normally just `self`."
        },
        {
          name: "Return Value",
          tone: "cool",
          requirement: "Primary output",
          details: "The owning Actor resolved from the component."
        }
      ],
      overrideNotes: [
        "When this appears in an Actor, Widget, or Level Blueprint, it usually means you already have a component reference and are stepping outward to the owner.",
        "If you only need one specific component's owner repeatedly, it may be clearer to keep that owner reference cached."
      ],
      utilityTypes: [],
      directTypes: ["actor-component", "scene-component"],
      referenceTypes: ["actor", "pawn", "character", "level-blueprint", "widget-blueprint", "animation-blueprint"],
      cautionTypes: ["blueprint-macro-library"],
      blockedTypes: ["blueprint-function-library", "blueprint-interface"],
      notes: [
        "This is direct-on-self for component Blueprints.",
        "Actor, Pawn, Character, or UI graphs can still use it if they hold a component reference, but that is a reference-based path rather than the natural home."
      ],
      docLinks: [
        {
          label: "UActorComponent::GetOwner",
          url: "https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/Components/UActorComponent/GetOwner"
        },
        {
          label: "Adding Components to an Actor",
          url: "https://dev.epicgames.com/documentation/ru-ru/unreal-engine/adding-components-to-an-actor-in-unreal-engine"
        }
      ]
    },
    {
      id: "set-auto-activate",
      label: "Set Auto Activate",
      target: "Actor Component",
      kind: "Instance function",
      summary: "Controls whether a component auto-activates. Strong sign that the graph is reasoning about component lifecycle.",
      officialFact: "Epic documents UActorComponent::SetAutoActivate as a BlueprintCallable component function in the Components|Activation category.",
      inference: "Most of the time this belongs in a component-authored flow or in an owning Actor that is configuring one of its components.",
      defaultTypes: ["actor-component", "scene-component", "actor", "character"],
      parameters: [
        {
          name: "Target",
          tone: "warm",
          requirement: "Required input",
          details: "The component you want to configure."
        },
        {
          name: "New Auto Activate",
          tone: "warm",
          requirement: "Required input",
          details: "Whether the component should auto-activate."
        }
      ],
      overrideNotes: [
        "This is most user-friendly when the owning Actor is clearly configuring one of its known components during setup.",
        "If many outside systems keep flipping this on the same component, the activation policy may belong inside the component itself.",
        "Epic notes construction-script safety here, so graph placement and timing both matter."
      ],
      utilityTypes: [],
      directTypes: ["actor-component", "scene-component"],
      referenceTypes: ["actor", "pawn", "character", "level-blueprint", "widget-blueprint"],
      cautionTypes: ["animation-blueprint", "blueprint-macro-library"],
      blockedTypes: ["blueprint-function-library", "blueprint-interface"],
      notes: [
        "Direct fit for component graphs.",
        "Actor and Character graphs often use it while bootstrapping owned components.",
        "Epic notes that it is only safe during construction scripts, so placement is not the only concern here."
      ],
      docLinks: [
        {
          label: "UActorComponent::SetAutoActivate",
          url: "https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/Components/UActorComponent/SetAutoActivate"
        }
      ]
    },
    {
      id: "add-movement-input",
      label: "Add Movement Input",
      target: "Pawn",
      kind: "Pawn-target instance function",
      summary: "Adds movement input along a world direction. This is a classic Pawn or Character node.",
      officialFact: "Epic documents APawn::AddMovementInput as a BlueprintCallable Pawn function and notes that Character subclasses automatically handle the input and move.",
      inference: "If your graph is directly calling Add Movement Input on self, Pawn or Character is the clean home. Elsewhere, it should usually be a reference-based call into the controlled Pawn.",
      defaultTypes: ["character", "pawn"],
      parameters: [
        {
          name: "World Direction",
          tone: "warm",
          requirement: "Required input",
          details: "The movement direction in world space. This is usually normalized before use."
        },
        {
          name: "Scale Value",
          tone: "warm",
          requirement: "Required input",
          details: "How strong the movement input should be, often based on axis input."
        },
        {
          name: "Force",
          tone: "accent",
          requirement: "Optional override",
          details: "When enabled, applies input even if movement input would normally be ignored."
        }
      ],
      overrideNotes: [
        "If an Actor or Widget is driving this directly, the friendlier design is usually to hand the command to the controlled Pawn or Character instead.",
        "In components, this can still be clean if the component clearly augments movement on a specific Pawn owner."
      ],
      utilityTypes: [],
      directTypes: ["pawn", "character"],
      referenceTypes: ["actor-component", "level-blueprint"],
      cautionTypes: ["actor", "widget-blueprint", "animation-blueprint", "blueprint-macro-library"],
      blockedTypes: ["blueprint-function-library", "blueprint-interface"],
      notes: [
        "This is one of the clearest examples of a node whose target strongly suggests the correct Blueprint home.",
        "If an Actor graph wants this, it often means the logic really belongs in the Pawn or Character instead."
      ],
      docLinks: [
        {
          label: "APawn::AddMovementInput",
          url: "https://dev.epicgames.com/documentation/es-mx/unreal-engine/API/Runtime/Engine/GameFramework/APawn/AddMovementInput"
        }
      ]
    },
    {
      id: "get-movement-component",
      label: "Get Movement Component",
      target: "Pawn",
      kind: "Pawn-target instance function",
      summary: "Returns the PawnMovementComponent for a Pawn. Useful when movement logic needs to branch into movement-component details.",
      officialFact: "Epic documents APawn::GetMovementComponent as a BlueprintCallable Pawn function.",
      inference: "Best fit in Pawn and Character graphs, or in components that are explicitly augmenting pawn movement behavior.",
      defaultTypes: ["character", "pawn", "actor-component"],
      parameters: [
        {
          name: "Target",
          tone: "warm",
          requirement: "Required input",
          details: "The Pawn whose movement component you want. In Pawn and Character Blueprints this is usually `self`."
        },
        {
          name: "Return Value",
          tone: "cool",
          requirement: "Primary output",
          details: "The PawnMovementComponent returned from that Pawn."
        }
      ],
      overrideNotes: [
        "If you only need high-level movement commands, `Add Movement Input` is often friendlier than drilling into the movement component directly.",
        "When called from other Blueprint types, this usually means you are following a Pawn reference rather than owning the movement logic there."
      ],
      utilityTypes: [],
      directTypes: ["pawn", "character"],
      referenceTypes: ["actor-component", "level-blueprint", "widget-blueprint"],
      cautionTypes: ["actor", "animation-blueprint", "blueprint-macro-library"],
      blockedTypes: ["blueprint-function-library", "blueprint-interface"],
      notes: [
        "Direct on self for Pawn and Character.",
        "Outside those types, it usually belongs behind a pawn reference rather than driving architecture from the wrong Blueprint."
      ],
      docLinks: [
        {
          label: "APawn::GetMovementComponent",
          url: "https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/GameFramework/APawn/GetMovementComponent"
        }
      ]
    },
    {
      id: "timeline",
      label: "Timeline",
      target: "Blueprint event graph",
      kind: "Embedded Blueprint graph feature",
      summary: "A time-driven graph tool for animating values, events, and lerps over time inside a Blueprint.",
      officialFact: "Epic documents timelines as Blueprint graphs that can contain float, vector, color, and event tracks for time-based behavior.",
      inference: "Timelines are usually cleanest in Blueprints that directly own the thing being animated or driven over time, rather than in abstract utility layers.",
      defaultTypes: ["actor", "character", "pawn", "actor-component", "level-blueprint"],
      parameters: [
        {
          name: "Update",
          tone: "cool",
          requirement: "Primary output",
          details: "Exec output that fires every tick while the timeline is playing."
        },
        {
          name: "Finished",
          tone: "cool",
          requirement: "Primary output",
          details: "Exec output that fires once the timeline reaches the end."
        },
        {
          name: "Tracks",
          tone: "warm",
          requirement: "Required setup",
          details: "One or more float, vector, color, or event tracks that define the data over time."
        },
        {
          name: "Loop / Play Rate / Length",
          tone: "accent",
          requirement: "Common overrides",
          details: "Typical timeline settings you adjust when the animation timing or repeat behavior needs tuning."
        }
      ],
      overrideNotes: [
        "Great for doors, fades, moving platforms, camera offsets, and other owned time-based behavior.",
        "If a timeline is only there to animate UI, a Widget animation or UI-specific solution may be cleaner than pushing that logic into gameplay Blueprints.",
        "If the same time behavior needs to be reused across many actors, a component can be a cleaner default home than duplicating the timeline in every Actor."
      ],
      utilityTypes: ["actor", "character", "pawn", "actor-component", "level-blueprint"],
      directTypes: ["actor", "character", "pawn", "actor-component"],
      referenceTypes: ["scene-component"],
      cautionTypes: ["widget-blueprint", "animation-blueprint", "blueprint-macro-library"],
      blockedTypes: ["blueprint-function-library", "blueprint-interface"],
      notes: [
        "A Timeline is usually a sign that the Blueprint owns state over time, not just one stateless calculation.",
        "Function Libraries and Interfaces are poor homes because timelines need graph state and execution over time."
      ],
      docLinks: [
        {
          label: "Creating Timelines",
          url: "https://dev.epicgames.com/documentation/en-us/unreal-engine/creating-timelines-in-unreal-engine?application_version=5.6"
        },
        {
          label: "Timelines",
          url: "https://dev.epicgames.com/documentation/en-us/unreal-engine/timelines-in-unreal-engine?application_version=5.6"
        }
      ]
    },
    {
      id: "interface-message",
      label: "Interface Message",
      target: "Blueprint Interface contract",
      kind: "Cross-Blueprint communication node",
      summary: "Calls a Blueprint Interface function on another object without hard-casting to a concrete Blueprint class.",
      officialFact: "Epic describes Blueprint Interfaces as named functions without implementation, used so different Blueprint classes can share a callable contract.",
      inference: "Interface message nodes are best when one Blueprint needs to talk to another through a stable contract instead of owning the other Blueprint's concrete logic.",
      defaultTypes: ["actor", "character", "pawn", "actor-component", "widget-blueprint", "level-blueprint"],
      parameters: [
        {
          name: "Target",
          tone: "warm",
          requirement: "Required input",
          details: "The object you want to send the interface message to."
        },
        {
          name: "Interface Inputs",
          tone: "warm",
          requirement: "Required input",
          details: "Whatever input pins the specific interface function defines."
        },
        {
          name: "Outputs",
          tone: "cool",
          requirement: "Possible output",
          details: "Any return pins defined by the interface function, if that interface message returns values."
        }
      ],
      overrideNotes: [
        "The key override is usually not a pin value but the target choice: send the message to the object that owns the behavior, not to an unrelated middleman.",
        "If the target may or may not implement the interface, pair this with an interface check or a guarded reference path.",
        "If you constantly need target-specific branches after the message, the communication boundary may not actually be clean enough yet."
      ],
      utilityTypes: ["actor", "character", "pawn", "actor-component", "widget-blueprint", "level-blueprint"],
      directTypes: [],
      referenceTypes: ["animation-blueprint", "scene-component"],
      cautionTypes: ["blueprint-function-library", "blueprint-macro-library"],
      blockedTypes: [],
      notes: [
        "Blueprint Interfaces define the contract, but the message call usually lives in the Blueprint that is initiating communication.",
        "This is one of the friendliest ways to keep systems decoupled when many unrelated Blueprint classes need to react to the same kind of request."
      ],
      docLinks: [
        {
          label: "Blueprint Interface",
          url: "https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprint-interface-in-unreal-engine?application_version=5.6"
        },
        {
          label: "Types of Blueprints",
          url: "https://dev.epicgames.com/documentation/en-us/unreal-engine/types-of-blueprints-in-unreal-engine?application_version=5.6"
        }
      ]
    },
    {
      id: "create-widget",
      label: "Create Widget",
      target: "UI creation flow",
      kind: "Common cross-system node",
      summary: "Creates a Widget Blueprint instance so it can be stored and displayed. Often called from gameplay owners that decide when UI should appear.",
      officialFact: "Epic's Creating Widgets guide shows Create Widget being called in Level Blueprint or Character Blueprint and then added to the viewport.",
      inference: "Treat Create Widget as a gameplay-to-UI boundary node. It usually belongs where UI creation is triggered, not necessarily inside the widget being created.",
      defaultTypes: ["character", "level-blueprint", "widget-blueprint", "actor"],
      parameters: [
        {
          name: "Class",
          tone: "warm",
          requirement: "Required input",
          details: "The Widget Blueprint class to instantiate."
        },
        {
          name: "Owning Player",
          tone: "accent",
          requirement: "Common override",
          details: "Player controller that should own the widget. This becomes important for player-specific UI and multiplayer."
        },
        {
          name: "Return Value",
          tone: "cool",
          requirement: "Primary output",
          details: "The widget instance created from the class."
        }
      ],
      overrideNotes: [
        "If the widget is player-specific, set the owning player explicitly instead of relying on a vague global context.",
        "A widget can create another widget, but as a default pattern it is usually clearer for gameplay flow to create top-level UI."
      ],
      utilityTypes: ["character", "level-blueprint", "widget-blueprint"],
      directTypes: [],
      referenceTypes: ["actor", "pawn", "actor-component"],
      cautionTypes: ["animation-blueprint", "blueprint-function-library", "blueprint-macro-library"],
      blockedTypes: ["blueprint-interface"],
      notes: [
        "Common homes are Character, player-controller-style flow, and Level Blueprint startup orchestration.",
        "A widget can create another widget, but the page treats that as a secondary pattern rather than the default recommendation."
      ],
      docLinks: [
        {
          label: "Creating Widgets",
          url: "https://dev.epicgames.com/documentation/en-us/unreal-engine/creating-widgets-in-unreal-engine?application_version=5.6"
        },
        {
          label: "Widget Blueprints",
          url: "https://dev.epicgames.com/documentation/es-es/unreal-engine/widget-blueprints-in-umg-for-unreal-engine"
        }
      ]
    }
  ]
};

const blueprintTypeMap = new Map(blueprintSanityData.types.map((item) => [item.id, item]));
const blueprintFunctionMap = new Map(blueprintSanityData.functions.map((item) => [item.id, item]));

function sortByLabel(items) {
  return [...items].sort((left, right) => left.label.localeCompare(right.label));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderDocLinks(links) {
  return links
    .map(
      (link) =>
        `<a class="bp-link-chip" href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`
    )
    .join("");
}

function renderPill(label, tone = "neutral") {
  return `<span class="bp-pill bp-pill--${tone}">${escapeHtml(label)}</span>`;
}

function populateSelect(selectNode, items, selectedId) {
  selectNode.innerHTML = items
    .map(
      (item) =>
        `<option value="${escapeHtml(item.id)}"${item.id === selectedId ? " selected" : ""}>${escapeHtml(item.label)}</option>`
    )
    .join("");
}

function createPickerOption(item, isSelected) {
  return `
    <button class="bp-picker__option${isSelected ? " bp-picker__option--selected" : ""}" type="button" data-picker-option="${escapeHtml(item.id)}">
      ${escapeHtml(item.label)}
    </button>
  `;
}

function enhanceSelect(selectNode, items, onValueChange) {
  selectNode.classList.add("bp-native-select");

  const pickerNode = document.createElement("div");
  pickerNode.className = "bp-picker";
  pickerNode.innerHTML = `
    <button class="bp-picker__trigger" type="button" aria-expanded="false"></button>
    <div class="bp-picker__menu" hidden></div>
  `;

  selectNode.insertAdjacentElement("afterend", pickerNode);

  const triggerNode = pickerNode.querySelector(".bp-picker__trigger");
  const menuNode = pickerNode.querySelector(".bp-picker__menu");

  function sync() {
    const selectedValue = selectNode.value;
    const selectedItem = items.find((item) => item.id === selectedValue) || items[0];
    if (!selectedItem) {
      return;
    }

    triggerNode.textContent = selectedItem.label;
    menuNode.innerHTML = items
      .map((item) => createPickerOption(item, item.id === selectedItem.id))
      .join("");
  }

  function closeMenu() {
    pickerNode.classList.remove("is-open");
    triggerNode.setAttribute("aria-expanded", "false");
    menuNode.hidden = true;
  }

  function openMenu() {
    pickerNode.classList.add("is-open");
    triggerNode.setAttribute("aria-expanded", "true");
    menuNode.hidden = false;
  }

  triggerNode.addEventListener("click", () => {
    if (pickerNode.classList.contains("is-open")) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  menuNode.addEventListener("click", (event) => {
    const optionNode = event.target.closest("[data-picker-option]");
    if (!optionNode) {
      return;
    }

    const nextValue = optionNode.dataset.pickerOption;
    if (!nextValue) {
      closeMenu();
      return;
    }

    if (selectNode.value !== nextValue) {
      selectNode.value = nextValue;
      sync();
      onValueChange(nextValue);
    }

    closeMenu();
  });

  document.addEventListener("click", (event) => {
    if (!pickerNode.contains(event.target)) {
      closeMenu();
    }
  });

  sync();

  return { sync };
}

function findBestMatch(items, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const exact = items.find((item) => item.label.toLowerCase() === normalized);
  if (exact) {
    return exact;
  }

  const startsWith = items.find((item) => item.label.toLowerCase().startsWith(normalized));
  if (startsWith) {
    return startsWith;
  }

  return items.find((item) => item.label.toLowerCase().includes(normalized)) || null;
}

function renderFunctionList(functions, emptyMessage, tone) {
  if (!functions.length) {
    return `<p class="prose">${escapeHtml(emptyMessage)}</p>`;
  }

  return `<div class="bp-list">${functions
    .map(
      (item) => `
        <article class="bp-list-card">
          <div class="bp-list-card__head">
            <h3>${escapeHtml(item.label)}</h3>
            ${renderPill(item.target, tone)}
          </div>
          <p>${escapeHtml(item.summary)}</p>
        </article>`
    )
    .join("")}</div>`;
}

function renderTypeList(typeIds, emptyMessage, tone) {
  const items = sortByLabel(typeIds.map((id) => blueprintTypeMap.get(id)).filter(Boolean));
  if (!items.length) {
    return `<p class="prose">${escapeHtml(emptyMessage)}</p>`;
  }

  return `<div class="bp-list">${items
    .map(
      (item) => `
        <article class="bp-list-card">
          <div class="bp-list-card__head">
            <h3>${escapeHtml(item.label)}</h3>
            ${renderPill(
              tone === "warm"
                ? "Good home"
                : tone === "cool"
                  ? "Reference path"
                  : tone === "accent"
                    ? "Common home"
                    : "Caution",
              tone
            )}
          </div>
          <p>${escapeHtml(item.summary)}</p>
        </article>`
    )
    .join("")}</div>`;
}

function renderDefaultHomeList(typeIds, emptyMessage) {
  const items = typeIds.map((id) => blueprintTypeMap.get(id)).filter(Boolean);
  if (!items.length) {
    return `<p class="prose">${escapeHtml(emptyMessage)}</p>`;
  }

  return `<div class="bp-detail-grid">${items
    .map(
      (item) => `
        <article class="bp-detail-card">
          <div class="bp-list-card__head">
            <h3>${escapeHtml(item.label)}</h3>
            ${renderPill("Default home", "warm")}
          </div>
          <p>${escapeHtml(item.summary)}</p>
        </article>`
    )
    .join("")}</div>`;
}

function renderParameterList(parameters, emptyMessage) {
  if (!parameters || !parameters.length) {
    return `<p class="prose">${escapeHtml(emptyMessage)}</p>`;
  }

  return `<div class="bp-detail-grid">${parameters
    .map(
      (parameter) => `
        <article class="bp-detail-card">
          <div class="bp-list-card__head">
            <h3>${escapeHtml(parameter.name)}</h3>
            ${renderPill(parameter.requirement, parameter.tone || "neutral")}
          </div>
          <p>${escapeHtml(parameter.details)}</p>
        </article>`
    )
    .join("")}</div>`;
}

function renderNoteList(notes, emptyMessage) {
  if (!notes || !notes.length) {
    return `<p class="prose">${escapeHtml(emptyMessage)}</p>`;
  }

  return `<div class="bp-note-stack">${notes
    .map((note) => `<p class="bp-note">${escapeHtml(note)}</p>`)
    .join("")}</div>`;
}

function initBlueprintSanityCheck() {
  const appNode = document.getElementById("blueprint-sanity-check-app");
  if (!appNode) {
    return;
  }

  const queryInput = appNode.querySelector("[data-query-input]");
  const typeSelect = appNode.querySelector("[data-type-select]");
  const functionSelect = appNode.querySelector("[data-function-select]");
  const typeSelectWrap = appNode.querySelector("[data-type-select-wrap]");
  const functionSelectWrap = appNode.querySelector("[data-function-select-wrap]");
  const modeButtons = appNode.querySelectorAll("[data-mode-button]");
  const summaryCard = appNode.querySelector("[data-summary-card]");
  const primaryPanel = appNode.querySelector("[data-primary-panel]");
  const secondaryPanel = appNode.querySelector("[data-secondary-panel]");

  const sortedTypes = sortByLabel(blueprintSanityData.types);
  const sortedFunctions = sortByLabel(blueprintSanityData.functions);

  const state = {
    mode: "type",
    selectedTypeId: sortedTypes[0].id,
    selectedFunctionId: sortedFunctions[0].id
  };

  populateSelect(typeSelect, sortedTypes, state.selectedTypeId);
  populateSelect(functionSelect, sortedFunctions, state.selectedFunctionId);

  const typePicker = enhanceSelect(typeSelect, sortedTypes, (nextValue) => {
    state.selectedTypeId = nextValue;
    render();
  });

  const functionPicker = enhanceSelect(functionSelect, sortedFunctions, (nextValue) => {
    state.selectedFunctionId = nextValue;
    render();
  });

  function syncModeUi() {
    const isTypeMode = state.mode === "type";
    typeSelectWrap.hidden = !isTypeMode;
    functionSelectWrap.hidden = isTypeMode;
    typePicker.sync();
    functionPicker.sync();

    modeButtons.forEach((button) => {
      const active = button.dataset.modeButton === state.mode;
      button.classList.toggle("bp-sanity-tab--active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function renderTypeMode() {
    const type = blueprintTypeMap.get(state.selectedTypeId);
    const directFunctions = sortByLabel(
      blueprintSanityData.functions.filter((item) => item.directTypes.includes(type.id))
    );
    const utilityFunctions = sortByLabel(
      blueprintSanityData.functions.filter((item) => item.utilityTypes.includes(type.id))
    );
    const referenceFunctions = sortByLabel(
      blueprintSanityData.functions.filter((item) => item.referenceTypes.includes(type.id))
    );
    const cautionFunctions = sortByLabel(
      blueprintSanityData.functions.filter(
        (item) => item.cautionTypes.includes(type.id) || item.blockedTypes.includes(type.id)
      )
    );

    summaryCard.innerHTML = `
      <div class="bp-summary-grid">
        <div>
          <p class="kicker">Blueprint type</p>
          <h3 class="bp-summary-title">${escapeHtml(type.label)}</h3>
          <p class="prose">${escapeHtml(type.summary)}</p>
        </div>
        <div class="bp-summary-notes">
          <div>
            <span class="bp-mini-label">Best for</span>
            <p>${escapeHtml(type.bestFor)}</p>
          </div>
          <div>
            <span class="bp-mini-label">Avoid using it for</span>
            <p>${escapeHtml(type.avoid)}</p>
          </div>
        </div>
      </div>
      <div class="bp-links-row">${renderDocLinks(type.docLinks)}</div>
      <div class="bp-note-stack">${type.notes
        .map((note) => `<p class="bp-note">${escapeHtml(note)}</p>`)
        .join("")}</div>
    `;

    primaryPanel.innerHTML = `
      <p class="kicker">Likely fits</p>
      <h2 class="section-title">Functions that make sense directly here</h2>
      ${renderFunctionList(
        directFunctions,
        "This first pass does not include a direct-on-self example for this Blueprint type yet.",
        "warm"
      )}
      <div class="bp-subsection">
        <h3>Global utility nodes that are still common here</h3>
        ${renderFunctionList(
          utilityFunctions,
          "No common global utility examples are tagged here yet.",
          "accent"
        )}
      </div>
    `;

    secondaryPanel.innerHTML = `
      <p class="kicker">Sanity notes</p>
      <h2 class="section-title">Reference-based use and cautions</h2>
      <div class="bp-subsection">
        <h3>Usually reached through a reference</h3>
        ${renderFunctionList(
          referenceFunctions,
          "No reference-based examples are listed for this Blueprint type yet.",
          "cool"
        )}
      </div>
      <div class="bp-subsection">
        <h3>Nodes to treat cautiously here</h3>
        ${renderFunctionList(
          cautionFunctions,
          "No specific caution examples are listed for this Blueprint type yet.",
          "muted"
        )}
      </div>
    `;
  }

  function renderFunctionMode() {
    const item = blueprintFunctionMap.get(state.selectedFunctionId);
    const defaultTypeLabels = item.defaultTypes
      .map((id) => blueprintTypeMap.get(id))
      .filter(Boolean)
      .map((type) => type.label)
      .join(", ");

    summaryCard.innerHTML = `
      <div class="bp-summary-grid">
        <div>
          <p class="kicker">Node or function</p>
          <h3 class="bp-summary-title">${escapeHtml(item.label)}</h3>
          <p class="prose">${escapeHtml(item.summary)}</p>
        </div>
        <div class="bp-summary-notes">
          <div>
            <span class="bp-mini-label">Official target</span>
            <p>${escapeHtml(item.target)}</p>
          </div>
          <div>
            <span class="bp-mini-label">Default Blueprint homes</span>
            <p>${escapeHtml(defaultTypeLabels || "No default homes tagged yet.")}</p>
          </div>
        </div>
      </div>
      <div class="bp-links-row">${renderDocLinks(item.docLinks)}</div>
      <div class="bp-note-stack">
        <p class="bp-note"><strong>Official:</strong> ${escapeHtml(item.officialFact)}</p>
        <p class="bp-note"><strong>Inference:</strong> ${escapeHtml(item.inference)}</p>
      </div>
    `;

    primaryPanel.innerHTML = `
      <p class="kicker">Best homes</p>
      <h2 class="section-title">Where this node belongs by default</h2>
      <div class="bp-subsection">
        <h3>Default Blueprint homes</h3>
        ${renderDefaultHomeList(item.defaultTypes || [], "No default Blueprint homes are tagged for this node yet.")}
      </div>
      <div class="bp-subsection">
        <h3>Directly on self</h3>
        ${renderTypeList(item.directTypes, "This node is not really about a specific self-targeted Blueprint family.", "warm")}
      </div>
      <div class="bp-subsection">
        <h3>Common homes through global utility context</h3>
        ${renderTypeList(item.utilityTypes, "This node is not tagged as a broad utility fit.", "accent")}
      </div>
      <div class="bp-subsection">
        <h3>Parameters, pins, and values to expect</h3>
        ${renderParameterList(item.parameters, "Parameter details have not been added for this node yet.")}
      </div>
    `;

    secondaryPanel.innerHTML = `
      <p class="kicker">Reference paths and edge cases</p>
      <h2 class="section-title">Overrides, cautions, and restrictions</h2>
      <div class="bp-subsection">
        <h3>Usually called via another reference</h3>
        ${renderTypeList(item.referenceTypes, "This node does not rely on a reference-based fallback in this dataset.", "cool")}
      </div>
      <div class="bp-subsection">
        <h3>Common overrides and setup notes</h3>
        ${renderNoteList(item.overrideNotes, "No override guidance is listed for this node yet.")}
      </div>
      <div class="bp-subsection">
        <h3>Use with caution here</h3>
        ${renderTypeList(item.cautionTypes, "No caution tags are listed for this node.", "muted")}
      </div>
      <div class="bp-subsection">
        <h3>Usually not a fit</h3>
        ${renderTypeList(item.blockedTypes, "No blocked Blueprint types are listed for this node.", "muted")}
      </div>
      <div class="bp-subsection">
        <h3>Notes</h3>
        ${renderNoteList(item.notes, "No extra notes are listed for this node.")}
      </div>
    `;
  }

  function render() {
    syncModeUi();
    if (state.mode === "type") {
      renderTypeMode();
    } else {
      renderFunctionMode();
    }
  }

  function handleQuery() {
    const query = queryInput.value;
    if (!query.trim()) {
      return;
    }

    if (state.mode === "type") {
      const match = findBestMatch(sortedTypes, query);
      if (match) {
        state.selectedTypeId = match.id;
        typeSelect.value = match.id;
        typePicker.sync();
      }
    } else {
      const match = findBestMatch(sortedFunctions, query);
      if (match) {
        state.selectedFunctionId = match.id;
        functionSelect.value = match.id;
        functionPicker.sync();
      }
    }

    render();
  }

  queryInput.addEventListener("input", handleQuery);

  typeSelect.addEventListener("change", () => {
    state.selectedTypeId = typeSelect.value;
    typePicker.sync();
    render();
  });

  functionSelect.addEventListener("change", () => {
    state.selectedFunctionId = functionSelect.value;
    functionPicker.sync();
    render();
  });

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.modeButton;
      render();
      handleQuery();
    });
  });

  render();
}

initBlueprintSanityCheck();
