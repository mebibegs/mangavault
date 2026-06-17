"use client";

import { useEffect } from "react";

export default function AntiInspect() {
  useEffect(() => {
    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Disable keyboard shortcuts for DevTools
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === "F12") {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+I (DevTools)
      if (e.ctrlKey && e.shiftKey && e.key === "I") {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && e.key === "J") {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+C (Inspect Element)
      if (e.ctrlKey && e.shiftKey && e.key === "C") {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+U (View Source)
      if (e.ctrlKey && e.key === "u") {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+S (Save Page)
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        return false;
      }

      // Cmd+Option+I (Mac DevTools)
      if (e.metaKey && e.altKey && e.key === "i") {
        e.preventDefault();
        return false;
      }

      // Cmd+Option+J (Mac Console)
      if (e.metaKey && e.altKey && e.key === "j") {
        e.preventDefault();
        return false;
      }

      // Cmd+Option+U (Mac View Source)
      if (e.metaKey && e.altKey && e.key === "u") {
        e.preventDefault();
        return false;
      }
    };

    // Detect DevTools by checking window size difference
    let devToolsOpen = false;
    const threshold = 160;
    
    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        if (!devToolsOpen) {
          devToolsOpen = true;
          handleDevToolsOpen();
        }
      } else {
        devToolsOpen = false;
      }
    };

    const handleDevToolsOpen = () => {
      // Clear console and show warning
      console.clear();
      console.log(
        "%c⚠️ Stop!",
        "color: red; font-size: 50px; font-weight: bold; text-shadow: 2px 2px black;"
      );
      console.log(
        "%cThis browser feature is intended for developers.",
        "color: #666; font-size: 16px;"
      );
    };

    // Debugger trap (makes debugging annoying)
    const debuggerTrap = () => {
      const start = performance.now();
      // eslint-disable-next-line no-debugger
      debugger;
      const end = performance.now();
      // If debugger paused for more than 100ms, DevTools is likely open
      if (end - start > 100) {
        handleDevToolsOpen();
      }
    };

    // Disable text selection on the page
    const disableSelect = (e: Event) => {
      const target = e.target as HTMLElement;
      // Allow selection in input/textarea
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return true;
      }
      e.preventDefault();
      return false;
    };

    // Disable drag
    const disableDrag = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // Add event listeners
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("selectstart", disableSelect);
    document.addEventListener("dragstart", disableDrag);
    
    // Check for DevTools periodically
    const devToolsInterval = setInterval(checkDevTools, 1000);
    
    // Run debugger trap occasionally (not too often to avoid performance issues)
    const debuggerInterval = setInterval(debuggerTrap, 3000);

    // Clear console on load
    console.clear();

    // Cleanup
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("selectstart", disableSelect);
      document.removeEventListener("dragstart", disableDrag);
      clearInterval(devToolsInterval);
      clearInterval(debuggerInterval);
    };
  }, []);

  return null;
}
