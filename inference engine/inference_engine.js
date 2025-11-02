export const LABELS_JSON = "../Rule/label_covid-19.json";
export const RULES_JSON = "../Rule/rule_covid-19.json";

export async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Gagal memuat ${path} (${res.status})`);
  return await res.json();
}

export function interpretCF(cf) {
  if (cf < 0.2) return "tidak yakin";
  if (cf < 0.4) return "Mungkin";
  if (cf < 0.6) return "Kemungkinan besar";
  if (cf < 0.8) return "Hampir pasti";
  if (cf <= 0.95) return "Pasti";
  return "Pasti";
}

export function evaluateRule(rule, userCF) {
  let totalWeight = 0;
  let weightedSum = 0;
  let matchedSymptoms = 0;
  const totalSymptoms = rule.if.length;
  const CF_MAX_LIMIT = 0.9998;

  for (const p of rule.if) {
    const cfPengguna = userCF[p.gejala] ?? 0;
    totalWeight += p.cf;
    
    if (cfPengguna > 0) {
      const cfGejala = cfPengguna * p.cf;
      weightedSum += cfGejala;
      matchedSymptoms++;
    }
  }

  const matchFactor = matchedSymptoms / totalSymptoms;
  if (matchedSymptoms === 0 || matchFactor < 0.3) {
    return {
      then: rule.then,
      value: 0,
      percentage: 0,
      interpretation: "tidak yakin"
    };
  }

  const averageCF = weightedSum / totalWeight;
  let finalCF = averageCF * matchFactor * rule.cf;

  if (matchedSymptoms === totalSymptoms && 
      rule.if.every(p => (userCF[p.gejala] ?? 0) === 1.0)) {
    finalCF = CF_MAX_LIMIT;
  }
  
  if (finalCF > CF_MAX_LIMIT) {
    finalCF = CF_MAX_LIMIT;
  } 
  
  return { 
    then: rule.then, 
    value: finalCF,
    percentage: finalCF * 100,
    interpretation: interpretCF(finalCF)
  };
}

export function evaluateRules(rules, userCF) {
  const results = {};
  const CF_MAX_LIMIT = 0.9998;
  
  for (const rule of rules) {
    const { then: disease, value: newCFValue } = evaluateRule(rule, userCF);
    
    if (newCFValue > 0) {
      const limitedCFValue = Math.min(newCFValue, CF_MAX_LIMIT); 

      if (!results[disease]) {
        results[disease] = { value: limitedCFValue };
      } else {
        const oldCFValue = results[disease].value;
        let combinedCF = oldCFValue + limitedCFValue * (1 - oldCFValue); 
        results[disease].value = Math.min(combinedCF, CF_MAX_LIMIT);
      }
    }
  }
  
  const finalResults = {};
  for (const disease in results) {
    const finalCF = results[disease].value;
    finalResults[disease] = {
      value: finalCF,
      percentage: finalCF * 100,
      interpretation: interpretCF(finalCF)
    };
  }
  
  return finalResults;
}

export function formatResult(results, labels) {
  const output = [];
  
  for (const [disease, { value, percentage, interpretation }] of Object.entries(results)) {
    if (value > 0) {
      output.push({
        penyakit: labels[disease] || disease,
        cf: value,
        percentage: percentage.toFixed(2),
        interpretation: interpretation
      });
    }
  }
  
  return output.sort((a, b) => b.cf - a.cf);
}
