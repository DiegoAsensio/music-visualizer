import React, {useState, useEffect, useRef} from "react";
import {Play, Pause, Upload, Disc, Radio, Waves, Sparkles} from "lucide-react";

export default function App() {
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentFile, setCurrentFile] = useState(null);
	const [visualMode, setVisualMode] = useState("bars");
	const [audioContext, setAudioContext] = useState(null);
	const [analyser, setAnalyser] = useState(null);

	const audioRef = useRef(null);
	const canvasRef = useRef(null);
	const animationRef = useRef(null);
	const sourceRef = useRef(null);

	useEffect(() => {
		const ctx = new (window.AudioContext || window.webkitAudioContext)();
		const analyserNode = ctx.createAnalyser();
		analyserNode.fftSize = 512;
		setAudioContext(ctx);
		setAnalyser(analyserNode);

		return () => {
			if (animationRef.current) {
				cancelAnimationFrame(animationRef.current);
			}
			if (ctx) {
				ctx.close();
			}
		};
	}, []);

	const handleFileUpload = (e) => {
		const file = e.target.files[0];
		if (file && file.type.startsWith("audio/")) {
			const url = URL.createObjectURL(file);
			setCurrentFile({name: file.name, url});

			if (audioRef.current) {
				audioRef.current.src = url;
			}
		}
	};

	const togglePlay = () => {
		if (!audioRef.current || !currentFile) return;

		if (isPlaying) {
			audioRef.current.pause();
			setIsPlaying(false);
			if (animationRef.current) {
				cancelAnimationFrame(animationRef.current);
			}
		} else {
			if (audioContext.state === "suspended") {
				audioContext.resume();
			}

			if (!sourceRef.current && audioRef.current) {
				sourceRef.current = audioContext.createMediaElementSource(
					audioRef.current
				);
				sourceRef.current.connect(analyser);
				analyser.connect(audioContext.destination);
			}

			audioRef.current.play();
			setIsPlaying(true);
			visualize();
		}
	};

	const visualize = () => {
		const canvas = canvasRef.current;
		if (!canvas || !analyser) return;

		const ctx = canvas.getContext("2d");
		const bufferLength = analyser.frequencyBinCount;
		const dataArray = new Uint8Array(bufferLength);

		const draw = () => {
			animationRef.current = requestAnimationFrame(draw);
			analyser.getByteFrequencyData(dataArray);

			ctx.fillStyle = "rgba(10, 10, 20, 0.2)";
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			if (visualMode === "bars") {
				drawBars(ctx, dataArray, canvas);
			} else if (visualMode === "circular") {
				drawCircular(ctx, dataArray, canvas);
			} else if (visualMode === "wave") {
				drawWave(ctx, dataArray, canvas);
			} else if (visualMode === "particles") {
				drawParticles(ctx, dataArray, canvas);
			}
		};

		draw();
	};

	const drawBars = (ctx, dataArray, canvas) => {
		const barWidth = (canvas.width / dataArray.length) * 2.5;
		let x = 0;

		for (let i = 0; i < dataArray.length; i++) {
			const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;

			const hue = (i / dataArray.length) * 360;
			const gradient = ctx.createLinearGradient(
				0,
				canvas.height - barHeight,
				0,
				canvas.height
			);
			gradient.addColorStop(0, `hsla(${hue}, 100%, 60%, 0.8)`);
			gradient.addColorStop(1, `hsla(${hue}, 100%, 40%, 0.8)`);

			ctx.fillStyle = gradient;
			ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);

			x += barWidth;
		}
	};

	const drawCircular = (ctx, dataArray, canvas) => {
		const centerX = canvas.width / 2;
		const centerY = canvas.height / 2;
		const radius = Math.min(centerX, centerY) * 0.6;

		ctx.strokeStyle = "rgba(147, 51, 234, 0.3)";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
		ctx.stroke();

		const sliceAngle = (Math.PI * 2) / dataArray.length;

		for (let i = 0; i < dataArray.length; i++) {
			const angle = sliceAngle * i - Math.PI / 2;
			const barHeight = (dataArray[i] / 255) * radius * 0.8;

			const x1 = centerX + Math.cos(angle) * radius;
			const y1 = centerY + Math.sin(angle) * radius;
			const x2 = centerX + Math.cos(angle) * (radius + barHeight);
			const y2 = centerY + Math.sin(angle) * (radius + barHeight);

			const hue = (i / dataArray.length) * 360;
			ctx.strokeStyle = `hsla(${hue}, 100%, 60%, 0.8)`;
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.moveTo(x1, y1);
			ctx.lineTo(x2, y2);
			ctx.stroke();
		}
	};

	const drawWave = (ctx, dataArray, canvas) => {
		const sliceWidth = canvas.width / dataArray.length;
		let x = 0;

		ctx.lineWidth = 3;
		ctx.strokeStyle = "#a855f7";
		ctx.beginPath();

		for (let i = 0; i < dataArray.length; i++) {
			const v = dataArray[i] / 255.0;
			const y = (v * canvas.height) / 2 + canvas.height / 2;

			if (i === 0) {
				ctx.moveTo(x, y);
			} else {
				ctx.lineTo(x, y);
			}

			x += sliceWidth;
		}

		ctx.stroke();

		ctx.strokeStyle = "#ec4899";
		ctx.lineWidth = 2;
		ctx.beginPath();
		x = 0;

		for (let i = 0; i < dataArray.length; i++) {
			const v = dataArray[i] / 255.0;
			const y = canvas.height / 2 + Math.sin(x * 0.02 + v * 10) * (v * 100);

			if (i === 0) {
				ctx.moveTo(x, y);
			} else {
				ctx.lineTo(x, y);
			}

			x += sliceWidth;
		}

		ctx.stroke();
	};

	const particlesRef = useRef([]);

	const drawParticles = (ctx, dataArray, canvas) => {
		if (particlesRef.current.length === 0) {
			for (let i = 0; i < 100; i++) {
				particlesRef.current.push({
					x: Math.random() * canvas.width,
					y: Math.random() * canvas.height,
					vx: (Math.random() - 0.5) * 2,
					vy: (Math.random() - 0.5) * 2,
					size: Math.random() * 3 + 1,
				});
			}
		}

		const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
		const intensity = avg / 255;

		particlesRef.current.forEach((particle, i) => {
			const freqIndex = Math.floor(
				(i / particlesRef.current.length) * dataArray.length
			);
			const amplitude = dataArray[freqIndex] / 255;

			particle.x += particle.vx * (1 + intensity);
			particle.y += particle.vy * (1 + intensity);

			if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
			if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

			particle.x = Math.max(0, Math.min(canvas.width, particle.x));
			particle.y = Math.max(0, Math.min(canvas.height, particle.y));

			const hue = (i / particlesRef.current.length) * 360;
			const size = particle.size * (1 + amplitude * 3);

			ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${0.6 + amplitude * 0.4})`;
			ctx.beginPath();
			ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
			ctx.fill();
		});

		for (let i = 0; i < particlesRef.current.length; i++) {
			for (let j = i + 1; j < particlesRef.current.length; j++) {
				const dx = particlesRef.current[i].x - particlesRef.current[j].x;
				const dy = particlesRef.current[i].y - particlesRef.current[j].y;
				const distance = Math.sqrt(dx * dx + dy * dy);

				if (distance < 100) {
					ctx.strokeStyle = `rgba(168, 85, 247, ${0.2 * (1 - distance / 100)})`;
					ctx.lineWidth = 1;
					ctx.beginPath();
					ctx.moveTo(particlesRef.current[i].x, particlesRef.current[i].y);
					ctx.lineTo(particlesRef.current[j].x, particlesRef.current[j].y);
					ctx.stroke();
				}
			}
		}
	};

	const modes = [
		{id: "bars", name: "Barras", icon: Radio},
		{id: "circular", name: "Circular", icon: Disc},
		{id: "wave", name: "Ondas", icon: Waves},
		{id: "particles", name: "Partículas", icon: Sparkles},
	];

	return (
		<div className='min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white'>
			<div className='min-h-screen flex flex-col'>
				<header className='p-6 border-b border-purple-500/20 bg-slate-950/50 backdrop-blur-lg'>
					<div className='max-w-7xl mx-auto'>
						<h1 className='text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent'>
							Visualizador de Música
						</h1>
						<p className='text-gray-400 mt-2'>
							Animaciones reactivas al audio en tiempo real
						</p>
					</div>
				</header>

				<div className='flex-1 flex flex-col items-center justify-center p-6'>
					<div className='w-full max-w-5xl mb-8'>
						<canvas
							ref={canvasRef}
							width={1200}
							height={600}
							className='w-full rounded-xl border-2 border-purple-500/30 shadow-2xl shadow-purple-500/20 bg-slate-950/80'
						/>
					</div>

					<div className='w-full max-w-5xl space-y-6'>
						<div className='flex flex-col sm:flex-row gap-4 items-center justify-center'>
							<label className='cursor-pointer'>
								<input
									type='file'
									accept='audio/*'
									onChange={handleFileUpload}
									className='hidden'
								/>
								<div className='flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors'>
									<Upload className='w-5 h-5' />
									<span className='font-semibold'>Subir Audio</span>
								</div>
							</label>

							<button
								onClick={togglePlay}
								disabled={!currentFile}
								className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
									currentFile
										? "bg-gradient-to-r from-pink-600 to-purple-600 hover:shadow-lg hover:shadow-purple-500/50"
										: "bg-gray-700 cursor-not-allowed opacity-50"
								}`}
							>
								{isPlaying ? (
									<>
										<Pause className='w-5 h-5' />
										<span>Pausar</span>
									</>
								) : (
									<>
										<Play className='w-5 h-5' />
										<span>Reproducir</span>
									</>
								)}
							</button>
						</div>

						{currentFile && (
							<div className='text-center'>
								<p className='text-sm text-gray-400'>Reproduciendo:</p>
								<p className='text-purple-300 font-semibold'>
									{currentFile.name}
								</p>
							</div>
						)}

						<div className='bg-slate-900/50 rounded-xl p-6 border border-purple-500/20'>
							<p className='text-sm text-gray-400 mb-4 text-center'>
								Modo de Visualización
							</p>
							<div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
								{modes.map((mode) => {
									const Icon = mode.icon;
									return (
										<button
											key={mode.id}
											onClick={() => setVisualMode(mode.id)}
											className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-all ${
												visualMode === mode.id
													? "bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg shadow-purple-500/50"
													: "bg-slate-800/50 hover:bg-slate-800 border border-purple-500/20"
											}`}
										>
											<Icon className='w-6 h-6' />
											<span className='text-sm font-medium'>{mode.name}</span>
										</button>
									);
								})}
							</div>
						</div>

						{!currentFile && (
							<div className='bg-purple-500/10 border border-purple-500/30 rounded-xl p-6 text-center'>
								<p className='text-gray-300'>
									🎵 Sube un archivo de audio para comenzar la visualización
								</p>
								<p className='text-sm text-gray-500 mt-2'>
									Formatos soportados: MP3, WAV, OGG, M4A
								</p>
							</div>
						)}
					</div>
				</div>

				<audio ref={audioRef} />
			</div>
		</div>
	);
}
