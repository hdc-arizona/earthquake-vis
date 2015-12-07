%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%%%%%%%%%%%%%%%%%%%%%%% Matlab Code to Plot Profiles %%%%%%%%%%%%%%%%%%%%%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%  8/8/2015  %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
clear all; clc;

H1 = 16*12;  % (inches), first story height
H = 10.5*12; % (inches), typical story height 
Hbuild = 131.5*12; % (inches), Total height of the 12 story structure
g_grav = 386; % gravitational constant

% Load Shear Moment and Diaphragm Force
load St12HingeEQ7MCE.txt;
Intensity = 1.5; % 1.5 for MCE, 1.0 for DBE
Shear = St12HingeEQ7MCE(:,1:12);     % Shear 
Moment = St12HingeEQ7MCE(:,13:25);   % Moment
DiaForce = St12HingeEQ7MCE(:,26:38); % Diaphragm Force  
load Diaacel.txt;                    % Acceleration
load SWdis.txt;                      % Displacements
load EQnew7.txt;                     % Earthquake recording
PGA_ = max(abs(EQnew7))*g_grav*Intensity; % peak ground acceleration

Dt = 1.0/400.0; % seconds 
Dur = length(EQnew7)*Dt; % seconds
time = Dt:Dt:Dur;
figure;
plot(time, EQnew7); xlabel('Time, sec'); ylabel('Input EQ Acceleration, g'); 


% Displacement and Drift
SWdis; % (inches) 
SWdisN=[zeros(length(SWdis),1) SWdis];
IDrift = diff(SWdisN,1,2); % Interstory Drift (ID)
IDriftRatio = [zeros(length(IDrift),1) IDrift(:,1)/H1*100 IDrift(:,2:end)/H*100]; % Interstory Drift Ratio (IDR), percent
DriftRatio = [zeros(length(SWdis),1) SWdis/(Hbuild)*100]; % Drift/Hbuilding, percent

% Abs Max Envelopes
Shear_absMax = max(abs(Shear));
Moment_absMax = max(abs(Moment));
DiaForce_absMax = max(abs(DiaForce));
Diaacel = Diaacel/PGA_; % Normalized Acc 
Diaacel_absMax = max(abs(Diaacel));

% Earthquake
Dt = 1/400;             % time step (seconds)
Duration = 30.28;       % end duration (seconds)
time = Dt:Dt:Duration;  % Time vector, second

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%%%%%%%%%%%%%%%%%%%%% Time Histories Plot %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% Shear Profile at time corresponding to N = 1000;
LevelShear = 1; % 1 = At the base floor
LevelMoment = 1; % 1 = At the base floor
LevelDiaForce = 12; % 1 = At the base floor
figure;
subplot 311
plot(time, Shear(:,LevelShear));
xlabel('Time, sec'); ylabel('Shear');
subplot 312
plot(time, Moment(:,LevelMoment));
xlabel('Time, sec'); ylabel('Moment');
subplot 313
plot(time, DiaForce(:,LevelDiaForce));
xlabel('Time, sec'); ylabel('Diaphragm Force');

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%%%%%%% Profile Plots At an Arbitrary Point of Time %%%%%%%%%%%%%%%%%%%%%%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

time_I = 10;       % At 10 Seconds
Ind_I = time_I/Dt; % Index of time_I
Floors = 0:12;     % 12 story structure
Shear_I = Shear(Ind_I,:);
Moment_I = Moment(Ind_I,:);
DiaForce_I = DiaForce(Ind_I,:);
Diaacel_I = Diaacel(Ind_I,:);
DriftRatio_I = DriftRatio(Ind_I,:);   % Drift/Hbuilding
IDriftRatio_I = IDriftRatio(Ind_I,:); % IDdrift/Hi

% Shear is constant in one floor level, so to plot this:
Floors_0 = [Floors; Floors]; Floors_1 = Floors_0(:)'; Floors_1(1)=[];
Shear_0 = [Shear_I; Shear_I]; Shear_00 = Shear_0(:)'; Shear_1 = [Shear_00 0];



% Abs Max Envelopes (Con't)
DriftRatioM = max(abs(DriftRatio));
IDriftRatioM = max(abs(IDriftRatio));
% Rearrange for shear
Shear_0M = [Shear_absMax; Shear_absMax]; Shear_00M = Shear_0M(:)'; Shear_1M = [Shear_00M 0];


%%

figure;
subplot 161
plot(Shear_1,Floors_1,'-','linewidth',2); grid minor; hold on all;
plot(Shear_1M,Floors_1,'-g','linewidth',2); plot(-Shear_1M,Floors_1,'-g','linewidth',2);
xlabel('Shear'); ylabel('Floor Level'); axis tight;
subplot 162
plot(Moment_I,Floors,'-','linewidth',2); grid minor; hold on all;
plot(Moment_absMax,Floors,'-g','linewidth',2); plot(-Moment_absMax,Floors,'-g','linewidth',2);
xlabel('Moment'); axis tight;
subplot 163
plot(DiaForce_I, Floors,'-','linewidth',2); grid minor; hold on all;
plot(DiaForce_absMax, Floors,'-g','linewidth',2); plot(-DiaForce_absMax, Floors,'-g','linewidth',2);
xlabel('DiaForce'); axis tight;
subplot 164; % Diaacel
plot(Diaacel_I, Floors,'-','linewidth',2); grid minor; hold on all;
plot(Diaacel_absMax, Floors,'-g','linewidth',2); plot(-Diaacel_absMax, Floors,'-g','linewidth',2);
xlabel('DiaAcc / PGA'); axis tight;
subplot 165; % DriftRatio
plot(DriftRatio_I, Floors,'-','linewidth',2); grid minor; hold on all;
plot(DriftRatioM, Floors,'-g','linewidth',2); plot(-DriftRatioM, Floors,'-g','linewidth',2);
xlabel('Drift / H_{building} (%)'); axis tight;
subplot 166; % IDriftRatio
plot(IDriftRatio_I, Floors,'-','linewidth',2); grid minor; hold on all;
plot(IDriftRatioM, Floors,'-g','linewidth',2); plot(-IDriftRatioM, Floors,'-g','linewidth',2);
xlabel('Interstory Drift / H_{i}'); axis tight;


%% Save these extra measures for Youhao
Diaacel; DriftRatio; IDriftRatio;
save 4_DiaAcc_dividedby_PGA.txt Diaacel -ascii;
save 5_DriftRatio.txt DriftRatio -ascii;
save 6_InterstoryDriftRatio.txt IDriftRatio -ascii;





