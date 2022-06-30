using System;
using System.IO;
using System.Diagnostics;

class App {
	static Process startProcessWithOutput(string command, string args, bool showWindow) {
        Process p = new Process();
        p.StartInfo = new ProcessStartInfo(command, args);
        p.StartInfo.RedirectStandardOutput = false;
        p.StartInfo.RedirectStandardError = true;
        p.StartInfo.UseShellExecute = false;
		
		p.StartInfo.CreateNoWindow = !File.Exists("./al-mode-dev");
        p.Start();
        p.BeginErrorReadLine();

        return p;
    }
	
	static void Main(string[] args)  {
		startProcessWithOutput("./AutoLoot/src/node.exe", "./AutoLoot/src/main.js", true);
	}
}